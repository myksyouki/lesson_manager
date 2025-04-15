import Purchases, { LOG_LEVEL, PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { useAuthStore, PremiumStatus } from '../store/auth'; // Import the auth store and PremiumStatus type

const REVENUECAT_API_KEY_IOS = 'YOUR_REVENUECAT_IOS_API_KEY'; // Placeholder - User needs to provide this
const STANDARD_PLAN_ID = 'standard'; // Updated ID from user
const PRO_PLAN_ID = 'professional'; // Updated ID from user
const PREMIUM_ENTITLEMENT_ID = 'premium'; // Example ID, replace with actual entitlement identifier from RevenueCat if different

export const initializeIAP = () => {
  if (Platform.OS === 'ios') {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG); // Use DEBUG for development
    if (!REVENUECAT_API_KEY_IOS || REVENUECAT_API_KEY_IOS === 'YOUR_REVENUECAT_IOS_API_KEY') {
        console.warn('RevenueCat API Key for iOS is not set. Please provide it in services/iapService.ts');
        return; // Do not configure if key is missing
    }
    Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });
    console.log('RevenueCat SDK configured for iOS.');

    Purchases.addCustomerInfoUpdateListener(async (info) => {
      console.log('Received updated customer info:', info);
      await updatePremiumStatus(info);
    });
  }
};

export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
      console.log('Fetched offerings:', offerings.current);
      return offerings.current;
    } else {
      console.warn('No current offerings found or no available packages.');
    }
  } catch (e) {
    console.error('Error getting offerings:', e);
  }
  return null;
};

export const purchasePackage = async (pack: PurchasesPackage): Promise<boolean> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pack);
    console.log('Purchase successful:', customerInfo);
    await updatePremiumStatus(customerInfo);
    return true; // Indicate success
  } catch (e: any) {
    if (!e.userCancelled) {
      console.error('Error purchasing package:', e);
    } else {
      console.log('User cancelled purchase.');
    }
    return false; // Indicate failure or cancellation
  }
};

export const restorePurchases = async (): Promise<boolean> => {
   try {
     const restoreInfo = await Purchases.restorePurchases();
     console.log('Restore purchases successful:', restoreInfo);
     await updatePremiumStatus(restoreInfo);
     return true;
   } catch (e) {
     console.error('Error restoring purchases:', e);
     return false;
   }
};

export const checkSubscriptionStatus = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('Checked customer info:', customerInfo);
    await updatePremiumStatus(customerInfo);
  } catch (e) {
    console.error('Error checking subscription status:', e);
  }
};

const updatePremiumStatus = async (customerInfo: CustomerInfo) => {
    const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
    const isPremium = typeof entitlement !== 'undefined';
    const expiryDate = entitlement?.expirationDate ? new Date(entitlement.expirationDate) : null;

    console.log(`Updating premium status based on entitlement '${PREMIUM_ENTITLEMENT_ID}':`, isPremium, 'Expiry:', expiryDate);

    const setPremiumStatus = useAuthStore.getState().setPremiumStatus;
    if (setPremiumStatus) {
      setPremiumStatus({ isPremium: isPremium, expiryDate: expiryDate });
      console.log('Auth store premium status updated.');
    } else {
      console.error('Could not find setPremiumStatus function in useAuthStore. State not updated.');
    }
};
