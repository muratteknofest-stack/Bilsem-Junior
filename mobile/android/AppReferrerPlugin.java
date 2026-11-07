package com.quantumtech.bilsemjunior;

import android.os.RemoteException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;

@CapacitorPlugin(name = "AppReferrer")
public class AppReferrerPlugin extends Plugin {
    @PluginMethod
    public void getInstallReferrer(PluginCall call) {
        try {
            InstallReferrerClient referrerClient = InstallReferrerClient.newBuilder(getContext()).build();
            referrerClient.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int responseCode) {
                    if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                        try {
                            ReferrerDetails response = referrerClient.getInstallReferrer();
                            String referrerUrl = response != null ? response.getInstallReferrer() : null;
                            try { referrerClient.endConnection(); } catch (Exception ignored) {}
                            JSObject ret = new JSObject();
                            ret.put("referrer", referrerUrl != null ? referrerUrl : "");
                            call.resolve(ret);
                        } catch (RemoteException e) {
                            try { referrerClient.endConnection(); } catch (Exception ignored) {}
                            call.resolve(new JSObject());
                        }
                    } else {
                        try { referrerClient.endConnection(); } catch (Exception ignored) {}
                        call.resolve(new JSObject());
                    }
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    // Auto-reconnect or ignore on disconnection
                }
            });
        } catch (Exception e) {
            call.resolve(new JSObject());
        }
    }
}
