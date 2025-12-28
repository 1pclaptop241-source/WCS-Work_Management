import { useState, useEffect } from 'react';
import { paymentsAPI, API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { formatDate } from '../../utils/formatDate';
import { generateInvoice } from '../../utils/generateInvoice';
import confetti from 'canvas-confetti';
import './ClientPaymentPage.css';

const ClientPaymentPage = () => {
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentsAPI.getByClient(user._id);
      setPayments(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
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

  const calculateTotal = () => {
    return payments.reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || 0), 0);
  };

  const [showPayTotalModal, setShowPayTotalModal] = useState(false);
  const [totalPaymentScreenshot, setTotalPaymentScreenshot] = useState(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [showEditProofModal, setShowEditProofModal] = useState(false);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState(null);
  const [newProofFile, setNewProofFile] = useState(null);
  const [isUpdatingProof, setIsUpdatingProof] = useState(false);

  const pendingPayments = payments.filter(p => !p.received);
  const historyPayments = payments.filter(p => p.received);

  const displayedPayments = activeTab === 'pending' ? pendingPayments : historyPayments;

  // Calculate total based on selection or all pending if none selected? 
  // Better UX: If selection > 0, pay selection. If 0, button disabled or pays all? 
  // Let's force explicit selection or "Select All".
  // Actually, keeping "Pay Total" as "Pay All Pending" is useful shortcut. 
  // I will show "Pay Selected (X)" if selection > 0, else "Select Payments to Pay".

  const paymentsToPay = selectedPaymentIds.length > 0
    ? pendingPayments.filter(p => selectedPaymentIds.includes(p._id))
    : [];

  const amountToPay = paymentsToPay.reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || 0), 0);

  const handleCheckboxChange = (id) => {
    setSelectedPaymentIds(prev => {
      if (prev.includes(id)) return prev.filter(pid => pid !== id);
      return [...prev, id];
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPaymentIds(pendingPayments.filter(p => !p.paid).map(p => p._id));
    } else {
      setSelectedPaymentIds([]);
    }
  };

  const handlePay = async () => {
    try {
      if (!totalPaymentScreenshot) {
        await showAlert('Please select a screenshot first', 'Validation Error');
        return;
      }
      if (selectedPaymentIds.length === 0) {
        await showAlert('Please select at least one payment.', 'Validation Error');
        return;
      }

      await paymentsAPI.markBulkClientPaid(selectedPaymentIds, totalPaymentScreenshot);

      // Payment Success Animation (Money!)
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        zIndex: 2100,
        colors: ['#28a745', '#85bb65', '#d4edda'], // Green shades
        shapes: ['circle', 'square'],
        scalar: 1.2
      });

      setTotalPaymentScreenshot(null);
      setShowPayTotalModal(false);
      setSelectedPaymentIds([]);
      await loadPayments();
      setError('');
      await showAlert('Selected payments marked as paid successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark payments as paid');
    }
  };

  const handleUpdateProof = async () => {
    try {
      if (!newProofFile) {
        await showAlert('Please select a new screenshot', 'Validation Error');
        return;
      }
      setIsUpdatingProof(true);
      await paymentsAPI.markClientPaid(selectedPaymentForEdit._id, newProofFile);
      await loadPayments();
      setShowEditProofModal(false);
      setNewProofFile(null);
      setSelectedPaymentForEdit(null);
      await showAlert('Payment proof updated successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update proof');
    } finally {
      setIsUpdatingProof(false);
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Payment Information</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

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
          onClick={() => setActiveTab('history')}
        >
          History ({historyPayments.length})
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">Payments to Admin</h2>
          {activeTab === 'pending' && pendingPayments.length > 0 && selectedPaymentIds.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => setShowPayTotalModal(true)}
            >
              Pay Selected ({formatCurrency(amountToPay, payments[0]?.project?.currency || 'INR')})
            </button>
          )}
        </div>
        <div className="card-body">
          {displayedPayments.length === 0 ? (
            <p className="text-center">
              {activeTab === 'pending' ? 'No pending payments.' : 'No payment history.'}
            </p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        {activeTab === 'pending' && pendingPayments.filter(p => !p.paid).length > 0 && (
                          <input
                            type="checkbox"
                            onChange={handleSelectAll}
                            checked={selectedPaymentIds.length === pendingPayments.filter(p => !p.paid).length}
                          />
                        )}
                      </th>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Payment Paid Date</th>
                      <th>Closed Date</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPayments.map((payment) => {
                      const isPending = !payment.paid && !payment.received;
                      return (
                        <tr key={payment._id}>
                          <td>
                            {activeTab === 'pending' && isPending && (
                              <input
                                type="checkbox"
                                checked={selectedPaymentIds.includes(payment._id)}
                                onChange={() => handleCheckboxChange(payment._id)}
                              />
                            )}
                          </td>
                          <td>{payment.project?.title}</td>
                          <td>
                            {payment.received ? (
                              <span className="badge badge-success" style={{
                                display: 'inline-block', padding: '8px 16px', borderRadius: '20px',
                                backgroundColor: '#d4edda', color: '#155724', fontWeight: 'bold', fontSize: '13px', border: '1px solid #c3e6cb'
                              }}>
                                ✓ Payment Successful
                              </span>
                            ) : payment.paid ? (
                              payment.paymentScreenshot ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                                  <a
                                    href={payment.paymentScreenshot}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="badge badge-primary"
                                    style={{
                                      display: 'inline-block', padding: '8px 16px', borderRadius: '20px',
                                      backgroundColor: '#cfe2ff', color: '#084298', fontWeight: 'bold', fontSize: '13px', border: '1px solid #b6d4fe',
                                      textDecoration: 'none', cursor: 'pointer'
                                    }}
                                    title="Click to view proof"
                                  >
                                    ⏱ Verifying
                                  </a>
                                  <button
                                    className="btn btn-xs btn-outline-secondary"
                                    style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', border: '1px solid #ccc' }}
                                    onClick={() => {
                                      setSelectedPaymentForEdit(payment);
                                      setShowEditProofModal(true);
                                    }}
                                  >
                                    ✎ Edit Proof
                                  </button>
                                </div>
                              ) : (
                                <span className="badge badge-primary" style={{
                                  display: 'inline-block', padding: '8px 16px', borderRadius: '20px',
                                  backgroundColor: '#cfe2ff', color: '#084298', fontWeight: 'bold', fontSize: '13px', border: '1px solid #b6d4fe'
                                }}>
                                  ⏱ Verifying
                                </span>
                              )
                            ) : (
                              <span className="badge badge-warning" style={{
                                display: 'inline-block', padding: '8px 16px', borderRadius: '20px',
                                backgroundColor: '#fff3cd', color: '#997404', fontWeight: 'bold', fontSize: '13px', border: '1px solid #ffecb5'
                              }}>
                                ⚠ Pending
                              </span>
                            )}
                          </td>
                          <td>{payment.paidAt ? formatDate(payment.paidAt) : '-'}</td>
                          <td>{payment.project?.closedAt ? formatDate(payment.project.closedAt) : '-'}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
                              <strong>
                                {formatCurrency(payment.finalAmount || payment.originalAmount || 0, payment.project?.currency || 'INR')}
                              </strong>
                              {/* {payment.received && (
                                <button
                                  className="btn btn-sm btn-secondary"
                                  style={{ fontSize: '11px', padding: '2px 8px' }}
                                  onClick={() => generateInvoice(payment, user)}
                                >
                                  Download Invoice
                                </button>
                              )} */}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Total Row - show total of SELECTED if any, or total pending? */}
                  <tfoot>
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9', borderTop: '2px solid #ddd' }}>
                      <td colSpan="5" style={{ textAlign: 'right' }}>
                        {activeTab === 'pending' && selectedPaymentIds.length > 0 ? 'Total Selected Amount:' : activeTab === 'pending' ? 'Total Pending Amount:' : 'Total History Amount:'}
                      </td>
                      <td style={{ fontSize: '1.2em', color: '#dc3545' }}>
                        {activeTab === 'pending'
                          ? (selectedPaymentIds.length > 0
                            ? formatCurrency(amountToPay, payments[0]?.project?.currency || 'INR')
                            : formatCurrency(pendingPayments.filter(p => !p.paid).reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || 0), 0), payments[0]?.project?.currency || 'INR'))
                          : formatCurrency(historyPayments.reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || 0), 0), payments[0]?.project?.currency || 'INR')
                        }
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pay Total Modal */}
      {showPayTotalModal && (
        <div className="modal-overlay" onClick={() => setShowPayTotalModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Payment Proof</h2>
              <button className="modal-close" onClick={() => setShowPayTotalModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>You are about to pay for <strong>{paymentsToPay.length}</strong> selected items.</p>
              <p style={{ fontSize: '1.2em' }}>Total Amount: <strong>{formatCurrency(amountToPay, payments[0]?.project?.currency || 'INR')}</strong></p>
              <div className="form-group">
                <label>Upload Screenshot</label>
                <input
                  type="file"
                  className="form-input"
                  accept="image/*"
                  onChange={(e) => setTotalPaymentScreenshot(e.target.files[0])}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPayTotalModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePay}>Submit Payment</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Proof Modal */}
      {showEditProofModal && (
        <div className="modal-overlay" onClick={() => { if (!isUpdatingProof) setShowEditProofModal(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Payment Proof</h2>
              <button className="modal-close" onClick={() => setShowEditProofModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>You are updating the proof for project: <strong>{selectedPaymentForEdit?.project?.title}</strong></p>
              <div className="form-group">
                <label>Upload New Screenshot</label>
                <input
                  type="file"
                  className="form-input"
                  accept="image/*"
                  onChange={(e) => setNewProofFile(e.target.files[0])}
                  disabled={isUpdatingProof}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditProofModal(false)} disabled={isUpdatingProof}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateProof} disabled={isUpdatingProof}>
                {isUpdatingProof ? 'Updating...' : 'Update Proof'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPaymentPage;

