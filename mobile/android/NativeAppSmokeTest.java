package com.zekapark.app;

import android.content.Intent;
import android.os.SystemClock;
import android.util.Log;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Read-only live checks. Never creates accounts, sends mail, or starts payments. */
@RunWith(AndroidJUnit4.class)
public class NativeAppSmokeTest {
    private MainActivity activity;

    private String evaluate(String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
            activity.getBridge().getWebView().evaluateJavascript(script, result -> { value.set(result); latch.countDown(); }));
        assertTrue("WebView callback timed out for: " + script, latch.await(30, TimeUnit.SECONDS));
        return value.get();
    }
    private void awaitTrue(String script) throws Exception {
        long end = SystemClock.elapsedRealtime() + 60000;
        String last = "";
        while (SystemClock.elapsedRealtime() < end) {
            last = evaluate(script);
            if ("true".equals(last)) return;
            SystemClock.sleep(250);
        }
        fail("WebView condition did not pass: " + script + " result=" + last + " body=" + evaluate("document.body.innerText.slice(0,2500)"));
    }

    @Test public void startupRegistrationBackAndNativeApi() throws Exception {
        Intent intent = new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        activity = (MainActivity) InstrumentationRegistry.getInstrumentation().startActivitySync(intent);
        try {
            awaitTrue("Boolean(document.querySelector('#native-home-title'))");
            Log.i("Bilsem JuniorSmoke", "Compact mobile home rendered");
            assertEquals("true", evaluate("Boolean(document.querySelector('.zp-native-home-nav')) && !document.querySelector('#membership-title')"));
            evaluate("[...document.querySelectorAll('.zp-native-home-nav button')].find(b=>b.textContent.trim()==='Yardım').click()");
            awaitTrue("Boolean(document.querySelector('.zp-native-help'))");
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> activity.getOnBackPressedDispatcher().onBackPressed());
            awaitTrue("Boolean(document.querySelector('#native-home-title'))");
            evaluate("document.querySelector('.zp-native-primary').click()");
            awaitTrue("Boolean(document.querySelector('#zp-auth-heading'))");
            Log.i("Bilsem JuniorSmoke", "Login reached from shared home");
            assertEquals("true", evaluate("window.Capacitor.isNativePlatform()"));
            assertEquals("true", evaluate("document.documentElement.dataset.nativeApp === 'android'"));
            assertEquals("true", evaluate("document.documentElement.scrollWidth <= innerWidth + 1"));
            // Call the installed native plugin against the real API. Private data still requires auth.
            evaluate("window.__nativeSmoke = null; Promise.all([Capacitor.Plugins.CapacitorHttp.request({url:'https://bilsemjunior.vercel.app/api/health',method:'GET',disableRedirects:true,connectTimeout:10000,readTimeout:30000}),Capacitor.Plugins.CapacitorHttp.request({url:'https://bilsemjunior.vercel.app/api/account/requests',method:'GET',disableRedirects:true,connectTimeout:10000,readTimeout:30000})]).then(r=>window.__nativeSmoke=r.map(x=>({status:x.status,data:x.data}))).catch(e=>window.__nativeSmoke={error:String(e)})");
            awaitTrue("window.__nativeSmoke !== null");
            assertEquals("true", evaluate("Array.isArray(window.__nativeSmoke) && window.__nativeSmoke[0].status === 200 && window.__nativeSmoke[0].data.database === 'ready' && window.__nativeSmoke[1].status === 401"));
            Log.i("Bilsem JuniorSmoke", "Native public API and private authentication boundary passed");
            evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Yeni Kayıt').click()");
            awaitTrue("Boolean(document.querySelector('#parent-email'))");
            awaitTrue("!document.body.innerText.includes('Kayıt durumu kontrol ediliyor.') && !document.body.innerText.includes('Kayıt durumu kontrol edilemedi.')");
            assertEquals("true", evaluate("document.documentElement.scrollWidth <= innerWidth + 1"));
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> activity.getOnBackPressedDispatcher().onBackPressed());
            awaitTrue("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Giriş Yap' && b.getAttribute('aria-pressed')==='true')");
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> activity.getOnBackPressedDispatcher().onBackPressed());
            awaitTrue("Boolean(document.querySelector('#native-home-title'))");
        } finally {
            Log.i("Bilsem JuniorSmoke", "Smoke finished; releasing activity");
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> activity.finish());
        }
    }
}
