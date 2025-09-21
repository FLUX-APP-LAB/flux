
import { useWallet as useWalletContext } from '../contexts/WalletContext';
import { useAppStore } from '../store/appStore';

export const useWallet = () => {
  const walletContext = useWalletContext();
  const { setCurrentUser } = useAppStore();

  // Enhanced function to refresh and update current user data
  const refreshAndSetCurrentUser = async () => {
    const refreshedUser = await walletContext.refreshCurrentUser();
    if (refreshedUser) {
      await setCurrentUser(refreshedUser);
      return refreshedUser;
    }
    return null;
  };

  return {
    ...walletContext,
    refreshAndSetCurrentUser,
  };
};
