import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  DollarSign, 
  Zap, 
  History, 
  Send, 
  Download,
  Loader2,
  TrendingUp,
  Gift
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useWallet } from '../../hooks/useWallet';
import { formatNumber } from '../../lib/utils';
import toast from 'react-hot-toast';

export const WalletScreen: React.FC = () => {
  const {
    walletAddress,
    isConnected,
    balance,
    isLoadingBalance,
    transactions,
    isLoadingTransactions,
    getBalance,
    getTransactionHistory,
    purchaseBits,
    sendGift,
    cheerWithBits,
    requestPayout,
    formatWalletAddress
  } = useWallet();

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'actions'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchaseBits = async () => {
    setIsProcessing(true);
    try {
      const success = await purchaseBits(100); // Purchase 100 coins worth of bits
      if (success) {
        toast.success('Bits purchased successfully!');
      } else {
        toast.error('Failed to purchase bits');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestPayout = async () => {
    setIsProcessing(true);
    try {
      const payoutId = await requestPayout(1000); // Request payout of 1000 coins
      if (payoutId) {
        toast.success(`Payout requested! ID: ${payoutId}`);
      } else {
        toast.error('Failed to request payout');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  

  return (
    <div className="min-h-screen bg-flux-bg-primary p-3 md:p-6 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-flux-text-primary mb-2">Wallet</h1>
          <p className="text-flux-text-secondary">
            Manage your FLUX tokens, bits, and earnings
          </p>
        </div>

        {/* Wallet Address Card */}
        <div className="bg-flux-bg-secondary rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-flux-text-primary mb-1">
                Wallet Address
              </h3>
              <p className="text-flux-text-secondary font-mono text-sm">
                {formatWalletAddress(walletAddress || undefined)}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigator.clipboard.writeText(walletAddress || '')}
            >
              Copy
            </Button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <motion.div
            className="bg-gradient-to-br from-flux-primary to-flux-accent-purple rounded-2xl p-6 text-white"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8" />
              {isLoadingBalance && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {isLoadingBalance ? '...' : formatNumber(balance?.appCoinBalance || 0)}
            </h3>
            <p className="text-white/80">FLUX Coins</p>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-flux-accent-gold to-flux-accent-orange rounded-2xl p-6 text-white"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8" />
              {isLoadingBalance && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {isLoadingBalance ? '...' : formatNumber(balance?.bitsBalance || 0)}
            </h3>
            <p className="text-white/80">Bits</p>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-flux-accent-green to-flux-accent-teal rounded-2xl p-6 text-white"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8" />
              {isLoadingBalance && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {isLoadingBalance ? '...' : formatNumber(balance?.lockedBalance || 0)}
            </h3>
            <p className="text-white/80">Locked Earnings</p>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-flux-bg-secondary rounded-2xl overflow-hidden">
          <div className="flex border-b border-flux-bg-tertiary">
            {[
              { id: 'overview', label: 'Overview', icon: Wallet },
              { id: 'transactions', label: 'Transactions', icon: History },
              { id: 'actions', label: 'Actions', icon: Send }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === tab.id
                    ? 'text-flux-primary bg-flux-primary/10 border-b-2 border-flux-primary'
                    : 'text-flux-text-secondary hover:text-flux-text-primary'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-flux-bg-tertiary rounded-xl p-4">
                    <h4 className="font-semibold text-flux-text-primary mb-2">
                      Quick Actions
                    </h4>
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full justify-start"
                        onClick={getBalance}
                        isLoading={isLoadingBalance}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Refresh Balance
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full justify-start"
                        onClick={() => getTransactionHistory()}
                        isLoading={isLoadingTransactions}
                      >
                        <History className="w-4 h-4 mr-2" />
                        Refresh Transactions
                      </Button>
                    </div>
                  </div>

                  <div className="bg-flux-bg-tertiary rounded-xl p-4">
                    <h4 className="font-semibold text-flux-text-primary mb-2">
                      Recent Activity
                    </h4>
                    <div className="space-y-2">
                      {transactions.slice(0, 3).map((tx) => (
                        <div key={tx.id} className="flex justify-between text-sm">
                          <span className="text-flux-text-secondary">{tx.type}</span>
                          <span className="text-flux-text-primary">{formatNumber(tx.amount)}</span>
                        </div>
                      ))}
                      {transactions.length === 0 && (
                        <p className="text-flux-text-secondary text-sm">No recent transactions</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-flux-text-primary">
                    Transaction History
                  </h3>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => getTransactionHistory()}
                    isLoading={isLoadingTransactions}
                  >
                    <History className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-flux-bg-tertiary rounded-lg p-4 flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-medium text-flux-text-primary">{tx.description}</h4>
                        <p className="text-sm text-flux-text-secondary">
                          {new Date(tx.timestamp).toLocaleDateString()} • {tx.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-flux-text-primary">
                          {formatNumber(tx.amount)}
                        </p>
                        <p className="text-xs text-flux-text-secondary">
                          {formatWalletAddress(tx.to)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {transactions.length === 0 && !isLoadingTransactions && (
                    <div className="text-center py-8 text-flux-text-secondary">
                      No transactions found
                    </div>
                  )}

                  {isLoadingTransactions && (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-flux-text-secondary" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions Tab */}
            {activeTab === 'actions' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-flux-text-primary">
                  Wallet Actions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-flux-bg-tertiary rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Zap className="w-6 h-6 text-flux-accent-gold" />
                      <h4 className="font-semibold text-flux-text-primary">Purchase Bits</h4>
                    </div>
                    <p className="text-flux-text-secondary text-sm mb-4">
                      Convert your coins to bits for cheering and supporting streamers
                    </p>
                    <Button
                      onClick={handlePurchaseBits}
                      isLoading={isProcessing}
                      className="w-full bg-flux-accent-gold hover:opacity-90"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Buy 200 Bits (100 Coins)
                    </Button>
                  </div>

                  <div className="bg-flux-bg-tertiary rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Download className="w-6 h-6 text-flux-accent-green" />
                      <h4 className="font-semibold text-flux-text-primary">Request Payout</h4>
                    </div>
                    <p className="text-flux-text-secondary text-sm mb-4">
                      Withdraw your earned tokens to your external wallet
                    </p>
                    <Button
                      onClick={handleRequestPayout}
                      isLoading={isProcessing}
                      className="w-full bg-flux-accent-green hover:opacity-90"
                      disabled={!balance || balance.lockedBalance < 1000}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Request Payout (1000 Coins)
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default WalletScreen;
