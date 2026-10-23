package com.quantumtech.bilsemjunior;

import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient client;
    private PluginCall purchaseCall;
    private boolean connecting;
    private boolean purchasePaused;
    private final List<Runnable> waiting = new ArrayList<>();
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override public void load() {
        client = BillingClient.newBuilder(getContext()).setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private boolean ok(BillingResult result) { return result.getResponseCode() == BillingClient.BillingResponseCode.OK; }
    private void ready(PluginCall call, Runnable action) {
        getActivity().runOnUiThread(() -> {
            if (client.isReady()) { action.run(); return; }
            final boolean[] finished = { false };
            Runnable timeout = () -> { if (!finished[0]) { finished[0] = true; connecting = false; call.reject("Google Play bağlantı süresi aşıldı.", "STORE_UNAVAILABLE"); } };
            handler.postDelayed(timeout, 15000);
            waiting.add(() -> { if (!finished[0]) { finished[0] = true; handler.removeCallbacks(timeout);
                if (client.isReady()) action.run(); else call.reject("Google Play bağlantısı kurulamadı.", "STORE_UNAVAILABLE"); } });
            if (connecting) return;
            connecting = true;
            client.startConnection(new BillingClientStateListener() {
                @Override public void onBillingSetupFinished(BillingResult result) {
                    connecting = false;
                    List<Runnable> callbacks = new ArrayList<>(waiting); waiting.clear();
                    for (Runnable callback : callbacks) callback.run();
                }
                @Override public void onBillingServiceDisconnected() { /* Auto service reconnection. */ }
            });
        });
    }
    private interface ProductCallback { void accept(ProductDetails product); }
    private void product(PluginCall call, ProductCallback callback) {
        String id = call.getString("productId", "");
        if (!id.matches("[a-z0-9][a-z0-9_.]{0,99}")) { call.reject("Ürün seçimi geçersiz.", "INVALID_PRODUCT"); return; }
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(
            QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.SUBS).build())).build();
        final boolean[] finished = { false };
        Runnable timeout = () -> { if (!finished[0]) { finished[0] = true; call.reject("Google Play ürünleri yüklenemedi.", "STORE_UNAVAILABLE"); } };
        handler.postDelayed(timeout, 15000);
        client.queryProductDetailsAsync(params, (result, details) -> {
            if (finished[0]) return;
            finished[0] = true; handler.removeCallbacks(timeout);
            if (!ok(result) || details.getProductDetailsList().size() != 1) { call.reject("Bu abonelik Google Play'de kullanılamıyor.", "PRODUCT_UNAVAILABLE"); return; }
            callback.accept(details.getProductDetailsList().get(0));
        });
    }
    private String period(String id) {
        switch (id) { case "monthly": return "P1M"; case "quarterly": return "P3M"; case "annual": return "P1Y"; default: return ""; }
    }
    private boolean supported(ProductDetails.SubscriptionOfferDetails offer) {
        if (offer.getOfferId() != null || period(offer.getBasePlanId()).isEmpty()) return false;
        List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
        return phases.size() == 1 && phases.get(0).getRecurrenceMode() == ProductDetails.RecurrenceMode.INFINITE_RECURRING
            && phases.get(0).getBillingPeriod().equals(period(offer.getBasePlanId())) && phases.get(0).getPriceAmountMicros() > 0;
    }
    @PluginMethod public void catalog(PluginCall call) {
        ready(call, () -> product(call, details -> {
            JSArray offers = new JSArray();
            if (details.getSubscriptionOfferDetails() != null) for (ProductDetails.SubscriptionOfferDetails offer : details.getSubscriptionOfferDetails()) {
                if (!supported(offer)) continue;
                ProductDetails.PricingPhase phase = offer.getPricingPhases().getPricingPhaseList().get(0);
                JSObject item = new JSObject(); item.put("basePlanId", offer.getBasePlanId()); item.put("price", phase.getFormattedPrice()); item.put("period", phase.getBillingPeriod()); offers.put(item);
            }
            JSObject response = new JSObject(); response.put("offers", offers); call.resolve(response);
        }));
    }
    @PluginMethod public void purchase(PluginCall call) {
        String account = call.getString("accountId", ""), profile = call.getString("profileId", ""), plan = call.getString("basePlanId", "");
        if (!account.matches("[a-f0-9]{64}") || !profile.matches("[a-f0-9]{64}") || period(plan).isEmpty()) { call.reject("Hesap veya paket bilgisi geçersiz.", "INVALID_ACCOUNT"); return; }
        if (purchaseCall != null) { call.reject("Bir satın alım zaten açık.", "PURCHASE_BUSY"); return; }
        // Fresh details prevent using stale offer tokens and stale prices.
        ready(call, () -> product(call, details -> {
            if (purchaseCall != null) { call.reject("Bir satın alım zaten açık.", "PURCHASE_BUSY"); return; }
            if (details.getSubscriptionOfferDetails() != null) for (ProductDetails.SubscriptionOfferDetails offer : details.getSubscriptionOfferDetails()) {
                if (!supported(offer) || !offer.getBasePlanId().equals(plan)) continue;
                BillingFlowParams params = BillingFlowParams.newBuilder().setObfuscatedAccountId(account).setObfuscatedProfileId(profile)
                    .setProductDetailsParamsList(Collections.singletonList(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).setOfferToken(offer.getOfferToken()).build())).build();
                getActivity().runOnUiThread(() -> {
                    if (purchaseCall != null) { call.reject("Bir satın alım zaten açık.", "PURCHASE_BUSY"); return; }
                    purchaseCall = call; purchasePaused = false;
                    BillingResult result = client.launchBillingFlow(getActivity(), params);
                    if (!ok(result)) {
                        purchaseCall = null;
                        if (result.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) queryOwned(call, response -> call.resolve(response));
                        else call.reject("Satın alım başlatılamadı. Satın alımları geri yükleyerek tekrar kontrol edin.", "PURCHASE_UNAVAILABLE");
                    }
                });
                return;
            }
            call.reject("Seçilen paket Google Play'de kullanılamıyor.", "PRODUCT_UNAVAILABLE");
        }));
    }
    private JSObject purchases(List<Purchase> list) {
        JSArray items = new JSArray();
        if (list != null) for (Purchase p : list) {
            if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED && p.getPurchaseState() != Purchase.PurchaseState.PENDING) continue;
            JSObject item = new JSObject(); item.put("token", p.getPurchaseToken()); item.put("productIds", new JSArray(p.getProducts()));
            item.put("state", p.getPurchaseState() == Purchase.PurchaseState.PURCHASED ? "purchased" : "pending");
            AccountIdentifiers ids = p.getAccountIdentifiers();
            item.put("accountId", ids == null ? null : ids.getObfuscatedAccountId()); item.put("profileId", ids == null ? null : ids.getObfuscatedProfileId());
            items.put(item);
        }
        JSObject response = new JSObject(); response.put("purchases", items); return response;
    }
    private interface OwnedCallback { void accept(JSObject response); }
    private void queryOwned(PluginCall call, OwnedCallback callback) { queryOwned(call, callback, false); }
    private void queryOwned(PluginCall call, OwnedCallback callback, boolean recovering) {
        final boolean[] finished = { false };
        Runnable timeout = () -> { if (!finished[0]) {
            finished[0] = true;
            if (recovering && purchaseCall != call) return;
            if (purchaseCall == call) purchaseCall = null;
            call.reject("Satın alımlar yüklenemedi. Geri yüklemeyi yeniden deneyin.", "STORE_UNAVAILABLE");
        } };
        handler.postDelayed(timeout, 15000);
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(), (result, list) -> {
            if (finished[0]) return; finished[0] = true; handler.removeCallbacks(timeout);
            if (recovering && purchaseCall != call) return;
            if (!ok(result)) {
                if (purchaseCall == call) purchaseCall = null;
                call.reject("Satın alımlar yüklenemedi. Geri yüklemeyi yeniden deneyin.", "STORE_UNAVAILABLE");
            } else callback.accept(purchases(list));
        });
    }
    @PluginMethod public void restore(PluginCall call) {
        ready(call, () -> queryOwned(call, response -> call.resolve(response)));
    }
    @Override protected void handleOnPause() {
        if (purchaseCall != null) purchasePaused = true;
    }
    @Override protected void handleOnResume() {
        if (purchaseCall == null || !purchasePaused) return;
        purchasePaused = false;
        final PluginCall returning = purchaseCall;
        // The Play sheet may close without delivering its callback (network/process change).
        // Give the normal callback priority, then query actual owned purchases, never a local grant.
        handler.postDelayed(() -> {
            if (purchaseCall != returning) return;
            if (!client.isReady()) {
                purchaseCall = null;
                returning.reject("Google Play bağlantısı kesildi. Satın alımları geri yükleyerek kontrol edin.", "STORE_UNAVAILABLE");
                return;
            }
            queryOwned(returning, response -> {
                purchaseCall = null;
                returning.resolve(response);
            }, true);
        }, 700);
    }
    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> list) {
        PluginCall call = purchaseCall; purchaseCall = null; purchasePaused = false;
        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (call != null) { JSObject response = purchases(null); response.put("cancelled", true); call.resolve(response); } return;
        }
        if (!ok(result)) { if (call != null) call.reject("Google Play satın alımı tamamlanamadı.", "PURCHASE_UNAVAILABLE"); return; }
        JSObject response = purchases(list);
        if (call != null) call.resolve(response); else notifyListeners("purchasesUpdated", response);
    }
    @Override protected void handleOnDestroy() {
        handler.removeCallbacksAndMessages(null); waiting.clear();
        if (purchaseCall != null) { purchaseCall.reject("Satın alımı geri yükleyerek kontrol edin.", "APP_CLOSED"); purchaseCall = null; }
        if (client != null) client.endConnection();
    }
}
