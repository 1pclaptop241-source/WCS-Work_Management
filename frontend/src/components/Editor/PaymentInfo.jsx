import { useEffect, useState } from 'react';
import { paymentsAPI, API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { formatDate } from '../../utils/formatDate';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './PaymentInfo.css';

const PaymentInfo = () => {
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const [paymentData, setPaymentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const paymentsRes = await paymentsAPI.getByEditor(user._id);
      setPaymentData(paymentsRes.data);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const [processingId, setProcessingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const handleMarkReceived = async (id) => {
    try {
      setProcessingId(id);
      await paymentsAPI.markReceived(id);

      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#28a745', '#85bb65', '#d4edda']
      });

      await loadPayments();
      showAlert('Payment marked as received!', 'Success');
    } catch (error) {
      console.error('Failed to mark as received:', error);
      showAlert(error.response?.data?.message || 'Failed to update payment status', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkMarkReceived = async () => {
    if (selectedIds.length === 0) return;
    try {
      setProcessingId('bulk');
      await paymentsAPI.markBulkReceived(selectedIds);

      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#28a745', '#ffc107', '#17a2b8']
      });

      setSelectedIds([]);
      await loadPayments();
      showAlert('Selected payments marked as received!', 'Success');
    } catch (error) {
      console.error('Failed to mark bulk received:', error);
      showAlert(error.response?.data?.message || 'Failed to update payments status', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount, currency = 'INR') => {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'EUR') {
      return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return amount.toLocaleString();
  };


  if (loading) {
    return <div className="spinner"></div>;
  }

  if (paymentData.length === 0) {
    return (
      <div className="card">
        <p className="text-center">No payment information available yet.</p>
      </div>
    );
  }

  const pendingPayments = paymentData.filter(p => !p.received && p.paymentType !== 'bonus' && p.paymentType !== 'deduction');
  const historyPayments = paymentData.filter(p => p.received || p.paymentType === 'bonus' || p.paymentType === 'deduction');

  const displayedPayments = activeTab === 'pending' ? pendingPayments : historyPayments;

  return (
    <div className="payment-info">
      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '20px' }}>
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({pendingPayments.length})
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); setSelectedIds([]); }}
        >
          History ({historyPayments.length})
        </button>
      </div>
      <motion.div
        className="card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        key={activeTab} // To re-trigger animation on tab switch
      >
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">Payment Information</h2>
          {activeTab === 'pending' && selectedIds.length > 0 && (
            <button
              className="btn btn-success btn-sm"
              onClick={handleBulkMarkReceived}
              disabled={processingId === 'bulk'}
            >
              {processingId === 'bulk' ? 'Processing...' : `Mark ${selectedIds.length} as Received`}
            </button>
          )}
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                {activeTab === 'pending' && (
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(pendingPayments.filter(p => p.paid).map(p => p._id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      checked={selectedIds.length > 0 && selectedIds.length === pendingPayments.filter(p => p.paid).length}
                    />
                  </th>
                )}
                <th>Project</th>
                <th>Work Type</th>
                <th>Deadline</th>
                <th>Original Amount</th>
                <th>Final Amount</th>
                <th>Deadline Crossed</th>
                <th>Status</th>
                {activeTab === 'pending' && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {displayedPayments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    {activeTab === 'pending' ? 'No pending payments.' : 'No payment history.'}
                  </td>
                </tr>
              ) : (
                displayedPayments.map((payment, index) => (
                  <motion.tr
                    key={payment._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {activeTab === 'pending' && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          disabled={!payment.paid}
                          checked={selectedIds.includes(payment._id)}
                          onChange={() => {
                            if (selectedIds.includes(payment._id)) {
                              setSelectedIds(selectedIds.filter(id => id !== payment._id));
                            } else {
                              setSelectedIds([...selectedIds, payment._id]);
                            }
                          }}
                        />
                      </td>
                    )}
                    <td>{payment.project?.title || 'N/A'}</td>
                    <td>{payment.workType || 'N/A'}</td>
                    <td>{formatDate(payment.deadline)}</td>
                    <td>{formatCurrency(payment.originalAmount || payment.baseAmount || 0, payment.project?.currency || 'INR')}</td>
                    <td>
                      <strong className={payment.deadlineCrossed ? 'final-amount-reduced' : 'final-amount'}>
                        {formatCurrency(payment.finalAmount || payment.originalAmount || payment.baseAmount || 0, payment.project?.currency || 'INR')}
                      </strong>
                    </td>
                    <td>
                      {payment.deadlineCrossed ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          backgroundColor: '#f8d7da',
                          color: '#842029',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          border: '1px solid #f5c2c7'
                        }}>
                          Yes ({payment.daysLate || 0} days)
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          backgroundColor: '#d4edda',
                          color: '#155724',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          border: '1px solid #c3e6cb'
                        }}>
                          No
                        </span>
                      )}
                    </td>
                    <td>
                      {payment.received ? (
                        <span className="badge badge-success">Received</span>
                      ) : (payment.paymentType === 'bonus' || payment.paymentType === 'deduction') ? (
                        <span className="badge badge-success">Applied</span>
                      ) : payment.paid ? (
                        payment.paymentScreenshot ? (
                          <a
                            href={`${API_BASE_URL}${payment.paymentScreenshot}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="badge badge-primary clickable-badge"
                            title="Click to view proof"
                            style={{ textDecoration: 'none', cursor: 'pointer' }}
                          >
                            Paid (Proof)
                          </a>
                        ) : (
                          <span className="badge badge-primary">Paid</span>
                        )
                      ) : (
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </td>
                    {activeTab === 'pending' && (
                      <td>
                        {payment.paid && !payment.received && (
                          <button
                            className="btn btn-xs btn-outline-success"
                            onClick={() => handleMarkReceived(payment._id)}
                            disabled={processingId === payment._id}
                          >
                            {processingId === payment._id ? '...' : 'Mark Received'}
                          </button>
                        )}
                        {!payment.paid && <span style={{ color: '#999', fontSize: '11px' }}>Awaiting Payment</span>}
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="payment-summary">
        <div className="summary-card">
          <h3>Payment Summary</h3>
          {(() => {
            const totals = displayedPayments.reduce((acc, p) => {
              const cur = p.project?.currency || 'INR';
              if (!acc[cur]) {
                acc[cur] = { original: 0, penalty: 0, final: 0 };
              }
              acc[cur].original += (p.originalAmount || p.baseAmount || 0);
              acc[cur].penalty += (p.penaltyAmount || 0);
              acc[cur].final += (p.finalAmount || p.originalAmount || p.baseAmount || 0);
              return acc;
            }, {});

            return Object.keys(totals).map(cur => (
              <div key={cur} className="currency-summary" style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: Object.keys(totals).length > 1 ? '1px dashed #eee' : 'none' }}>
                {Object.keys(totals).length > 1 && <h4 style={{ color: '#666', marginBottom: '10px' }}>{cur}</h4>}
                <div className="summary-item">
                  <span>Total Original Amount:</span>
                  <strong>{formatCurrency(totals[cur].original, cur)}</strong>
                </div>
                <div className="summary-item">
                  <span>Total Penalties:</span>
                  <strong className="penalty-amount">
                    -{formatCurrency(totals[cur].penalty, cur)}
                  </strong>
                </div>
                <div className="summary-item summary-total">
                  <span>Total Expected {cur === 'INR' ? 'Rupees' : 'Amount'}:</span>
                  <strong>
                    {formatCurrency(totals[cur].final, cur)}
                  </strong>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};
export default PaymentInfo;

