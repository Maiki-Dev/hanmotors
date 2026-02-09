import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image, ActivityIndicator, TextInput, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../constants/theme';
import { Header } from '../components/Header';
import { GoldButton } from '../components/GoldButton';
import { CreditCard, History, Plus, X, RefreshCw, ChevronRight } from 'lucide-react-native';
import { API_URL } from '../config';
import { io } from 'socket.io-client';

export default function WalletScreen({ navigation, route }) {
  const { driverId } = route.params || {};
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  
  // QPay State
  const [qpayVisible, setQpayVisible] = useState(false);
  const [qpayInvoice, setQpayInvoice] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchWallet();
    }, [driverId])
  );

  useEffect(() => {
    fetchWallet();

    const socket = io(API_URL);
    socket.on('walletUpdated', (data) => {
      if (data.driverId === driverId) {
        setBalance(data.balance);
        setTransactions(data.transactions);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [driverId]);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/driver/${driverId}/wallet`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch wallet', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async (amount) => {
    try {
      setLoading(true);
      // Call QPay Invoice Create
      const response = await fetch(`${API_URL}/api/payment/qpay/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, amount })
      });
      
      const data = await response.json();

      if (response.ok && (data.qr_image || data.qPay_shortUrl)) {
        setQpayInvoice(data);
        setQpayVisible(true);
      } else {
        const errorMessage = data.details 
          ? `${data.message}\n\n${typeof data.details === 'object' ? JSON.stringify(data.details) : data.details}`
          : (data.message || 'QPay нэхэмжлэх үүсгэхэд алдаа гарлаа.');
        Alert.alert('Алдаа', errorMessage);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Алдаа', `Сүлжээний алдаа: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const checkPaymentStatus = async () => {
    if (!qpayInvoice) return;
    
    setCheckingPayment(true);
    try {
        const response = await fetch(`${API_URL}/api/payment/qpay/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                invoiceId: qpayInvoice.invoice_id,
                driverId 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Alert.alert('Амжилттай', 'Төлбөр төлөгдлөө!');
            setQpayVisible(false);
            setQpayInvoice(null);
            fetchWallet(); // Refresh
        } else {
            Alert.alert('Мэдээлэл', 'Төлбөр хараахан төлөгдөөгүй байна.');
        }
    } catch (error) {
        Alert.alert('Алдаа', 'Төлбөр шалгахад алдаа гарлаа');
    } finally {
        setCheckingPayment(false);
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        {item.type === 'credit' ? (
          <Plus size={20} color={theme.colors.success} />
        ) : (
          <CreditCard size={20} color={theme.colors.error} />
        )}
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDesc}>{item.description}</Text>
        <Text style={styles.transactionDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <Text style={[
        styles.transactionAmount, 
        { color: item.type === 'credit' ? theme.colors.success : theme.colors.text }
      ]}>
        {item.type === 'credit' ? '+' : '-'}{item.amount.toLocaleString()}₮
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Миний данс" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Үлдэгдэл</Text>
          <Text style={styles.balanceAmount}>{balance.toLocaleString()}₮</Text>
          <Text style={styles.balanceSubtext}>Хан Моторс хэтэвч</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleRecharge(20000)}>
            <View style={styles.actionIcon}>
              <Plus size={24} color={theme.colors.white} />
            </View>
            <Text style={styles.actionText}>20,000₮</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleRecharge(50000)}>
            <View style={styles.actionIcon}>
              <Plus size={24} color={theme.colors.white} />
            </View>
            <Text style={styles.actionText}>50,000₮</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleRecharge(100000)}>
            <View style={styles.actionIcon}>
              <Plus size={24} color={theme.colors.white} />
            </View>
            <Text style={styles.actionText}>100,000₮</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.customAmountContainer}>
            <Text style={styles.sectionTitle}>Бусад дүн</Text>
            <View style={styles.inputRow}>
                <TextInput 
                    style={styles.input}
                    placeholder="Дүн оруулах"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                    value={customAmount}
                    onChangeText={setCustomAmount}
                />
                <TouchableOpacity 
                    style={styles.rechargeButton} 
                    onPress={() => {
                        if (!customAmount || isNaN(customAmount) || Number(customAmount) < 1000) {
                            Alert.alert('Анхааруулга', 'Цэнэглэх дүнгээ зөв оруулна уу (доод тал нь 1000₮)');
                            return;
                        }
                        handleRecharge(Number(customAmount));
                        setCustomAmount('');
                    }}
                >
                    <Text style={styles.rechargeButtonText}>Цэнэглэх</Text>
                </TouchableOpacity>
            </View>
        </View>

        <Text style={styles.sectionTitle}>Гүйлгээний түүх</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>Гүйлгээ хийгдээгүй байна</Text>
        ) : (
          transactions.map((item, index) => (
            <View key={index}>
              {renderTransaction({ item })}
              {index < transactions.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
      </ScrollView>

      {/* QPay Modal */}
      <Modal
        visible={qpayVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQpayVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>QPay Төлбөр</Text>
                <TouchableOpacity onPress={() => setQpayVisible(false)}>
                    <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>
            
            <View style={styles.qrContainer}>
                {qpayInvoice?.qr_image ? (
                    <Image 
                        source={{ uri: `data:image/png;base64,${qpayInvoice.qr_image}` }} 
                        style={styles.qrImage}
                    />
                ) : (
                    <Text>QR код ачаалж байна...</Text>
                )}
            </View>
            
            <Text style={styles.qrInstruction}>
                Банкны аппликейшнээр уншуулж төлнө үү.
            </Text>

            {qpayInvoice?.urls && (
              <View style={styles.bankListContainer}>
                <View style={styles.bankHeaderRow}>
                    <Text style={styles.bankListTitle}>Банкны апп сонгох:</Text>
                    <View style={styles.scrollHint}>
                        <Text style={styles.scrollHintText}>Цааш гүйлгэх</Text>
                        <ChevronRight size={14} color={theme.colors.textSecondary} />
                    </View>
                </View>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={true} 
                    contentContainerStyle={styles.bankList}
                    persistentScrollbar={true}
                >
                  {qpayInvoice.urls.map((bank, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.bankItem}
                      onPress={() => Linking.openURL(bank.link)}
                    >
                      <Image source={{ uri: bank.logo }} style={styles.bankLogo} />
                      <Text style={styles.bankName} numberOfLines={1}>{bank.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <GoldButton 
                title="Төлбөр шалгах"
                onPress={checkPaymentStatus}
                loading={checkingPayment}
                style={styles.checkButton}
            />
            
            <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setQpayVisible(false)}
            >
                <Text style={styles.cancelButtonText}>Болих</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  qrContainer: {
    width: 250,
    height: 250,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  qrImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  qrInstruction: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  checkButton: {
    width: '100%',
  },
  cancelButton: {
    marginTop: 12,
    padding: 8,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  bankListContainer: {
    width: '100%',
    marginBottom: 20,
  },
  bankHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  bankListTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollHintText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginRight: 2,
  },
  bankList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  bankItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 60,
  },
  bankLogo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginBottom: 5,
    resizeMode: 'contain',
  },
  bankName: {
    fontSize: 10,
    textAlign: 'center',
    color: theme.colors.text,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.l,
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  balanceLabel: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  balanceAmount: {
    color: theme.colors.black,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  balanceSubtext: {
    color: theme.colors.black,
    fontSize: 12,
    opacity: 0.6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  customAmountContainer: {
    marginBottom: theme.spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    color: theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rechargeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rechargeButtonText: {
    color: theme.colors.black,
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    width: '30%',
    elevation: 2,
  },
  actionIcon: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.m,
    color: theme.colors.text,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 20,
  }
});
