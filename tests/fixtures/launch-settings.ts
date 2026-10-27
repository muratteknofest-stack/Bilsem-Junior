import { COMMERCIAL_CHECKS, defaultPlatformSettings } from '../../src/lib/platform-settings';
// Automated fixtures only. These records are never written to a live project.
export function registrationReadySettings() {
  const settings = defaultPlatformSettings();
  settings.business = {legalName:'Fixture operator',address:'Fixture street 12, Test city',contactEmail:'test@example.invalid',contactPhone:'+90 555 000 0000',legalBases:'Fixture purposes',retention:'Fixture retention',transfers:'Fixture transfer mechanism'};
  for (const key of Object.keys(COMMERCIAL_CHECKS) as Array<keyof typeof COMMERCIAL_CHECKS>)
    if (COMMERCIAL_CHECKS[key].registration) settings.commercial[key] = {confirmed:true,reference:'Automated fixture reference only'};
  settings.release.registrationEnabled = true;
  return settings;
}
export function salesReadySettings() {
  const settings = registrationReadySettings();
  for (const key of Object.keys(settings.commercial) as Array<keyof typeof settings.commercial>)
    settings.commercial[key] = {confirmed:true,reference:'Automated fixture reference only'};
  settings.release = {registrationEnabled:true,emailTested:true,restoreTested:true,familyPilotTested:true,monitoringTested:true};
  return settings;
}
