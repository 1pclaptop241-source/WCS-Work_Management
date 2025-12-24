import React, { useState, useEffect } from 'react';
import { paymentsAPI, usersAPI, projectsAPI, API_BASE_URL } from '../../services/api';
import { useDialog } from '../../context/DialogContext';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import confetti from 'canvas-confetti';
import './AdminPaymentPage.css';

const AdminPaymentPage = () => {
  const { showAlert } = useDialog();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'editor', 'client', 'history'
  const [editors, setEditors] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedEditor, setSelectedEditor] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [editorPayments, setEditorPayments] = useState([]);
  const [clientPayments, setClientPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [historyPayments, setHistoryPayments] = useState([]);
  const [historyFilter, setHistoryFilter] = useState({ period: 'all', type: 'all' });
  const [statsMonth, setStatsMonth] = useState(new Date().getMonth() + 1);
  const [statsYear, setStatsYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bulk Pay State
  const [showPayTotalModal, setShowPayTotalModal] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [paymentsToPay, setPaymentsToPay] = useState([]); // Array of payment objects to pay
  const [bonusAmount, setBonusAmount] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [bonusNote, setBonusNote] = useState('Bonus');
  const [deductionNote, setDeductionNote] = useState('Deduction');
  const [showManualModal, setShowManualModal] = useState(false);
  const [allProjects, setAllProjects] = useState([]);
  const [manualPaymentForm, setManualPaymentForm] = useState({
    paymentType: 'bonus',
    editorId: '',
    clientId: '',
    projectId: '',
    amount: '',
    description: '',
    markAsPaid: true
  });

  // Editor Settlement State
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);

  useEffect(() => {
    loadEditors();
    if (activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'client') {
      loadClients();
      loadClientPayments();
    } else if (activeTab === 'history') {
      loadHistory();
    }
    loadAllProjects();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [historyFilter]);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadStats();
    }
  }, [statsMonth, statsYear]);

  useEffect(() => {
    if (selectedEditor && activeTab === 'editor') {
      loadEditorPayments();
    }
  }, [selectedEditor, activeTab]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await paymentsAPI.getStats(statsMonth, statsYear);
      setStats(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await paymentsAPI.getHistory(historyFilter.period, historyFilter.type);
      setHistoryPayments(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const loadEditors = async () => {
    try {
      const response = await usersAPI.getEditors();
      setEditors(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load editors');
    } finally {
      if (!selectedEditor && activeTab !== 'overview' && activeTab !== 'history') setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await usersAPI.getClients();
      setClients(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clients');
    }
  };

  const loadAllProjects = async () => {
    try {
      const response = await projectsAPI.getAccepted();
      setAllProjects(response.data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadEditorPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentsAPI.getByEditorForAdmin(selectedEditor);
      setEditorPayments(response.data);
      setSelectedPaymentIds([]); // Reset selection on reload
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadClientPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentsAPI.getAllClientPayments();
      setClientPayments(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  // Group Client Payments by Client
  const getFilteredClientPayments = () => {
    let filtered = clientPayments.filter(p => !p.received); // Only Pending (Not Received)
    if (selectedClient !== 'all') {
      filtered = filtered.filter(p => p.client?._id === selectedClient);
    }
    return filtered;
  };

  const groupedClientPayments = getFilteredClientPayments().reduce((acc, payment) => {
    const clientId = payment.client?._id;
    if (!clientId) return acc;
    if (!acc[clientId]) {
      acc[clientId] = {
        client: payment.client,
        payments: []
      };
    }
    acc[clientId].payments.push(payment);
    return acc;
  }, {});

  const handleMarkBulkClientReceived = async (paymentsToMark) => {
    try {
      const ids = paymentsToMark.map(p => p._id);
      await paymentsAPI.markBulkClientReceived(ids);

      // Money Rain Animation
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          zIndex: 2100,
          colors: ['#28a745', '#85bb65']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          zIndex: 2100,
          colors: ['#28a745', '#85bb65']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());

      await loadClientPayments();
      setError('');
      await showAlert(`Marked ${ids.length} payments as received successfully`, 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark payments received');
    }
  };

  const handlePayTotalEditor = async () => {
    try {
      // paymentsToPay is set when clicking the button
      const ids = paymentsToPay.map(p => p._id);

      if (ids.length === 0) return;

      await paymentsAPI.markBulkPaid(ids, paymentScreenshot, {
        bonusAmount: parseFloat(bonusAmount) || 0,
        deductionAmount: parseFloat(deductionAmount) || 0,
        bonusNote,
        deductionNote,
        editorId: paymentsToPay[0]?.editor?._id || paymentsToPay[0]?.editor
      });

      // Flying Cash Animation (Money Flying Away)
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.9 },
        colors: ['#d4edda', '#c3e6cb'], // Lighter greens
        startVelocity: 60,
        gravity: 0.5,
        scalar: 0.8,
        zIndex: 2100
      });

      setPaymentScreenshot(null);
      setShowPayTotalModal(false);
      setPaymentsToPay([]); // Reset
      setBonusAmount('');
      setDeductionAmount('');
      await loadEditorPayments();
      setError('');
      await showAlert('Payment marked as paid successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark payments as paid');
    }
  };

  const handleCreateManualPayment = async (e) => {
    e.preventDefault();
    try {
      await paymentsAPI.createManual(manualPaymentForm);
      setShowManualModal(false);
      setManualPaymentForm({
        paymentType: 'bonus',
        editorId: '',
        clientId: '',
        projectId: '',
        amount: '',
        description: '',
        markAsPaid: true
      });
      if (activeTab === 'overview') await loadStats();
      if (activeTab === 'editor' && selectedEditor) await loadEditorPayments();
      if (activeTab === 'client') await loadClientPayments();
      if (activeTab === 'history') await loadHistory();
      await showAlert('Manual payment adjustment added successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add manual payment');
    }
  };


  const exportToCSV = () => {
    if (historyPayments.length === 0) return;

    const headers = ['Date', 'Type', 'Project', 'Party', 'Amount', 'Status'];
    const rows = historyPayments.map(p => {
      const date = p.paymentType === 'client_charge' ? p.receivedAt : p.paidAt;
      const type = p.paymentType === 'client_charge' ? 'Income' : 'Expense';
      const party = p.paymentType === 'client_charge' ? p.client?.name : p.editor?.name;
      const amount = (p.finalAmount || p.originalAmount || 0).toFixed(2);

      return [
        formatDate(date),
        type,
        p.project?.title || 'N/A',
        party || 'N/A',
        amount,
        'Completed'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'payment_history.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const calculateTotal = (payments) => {
    return payments.reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || 0), 0);
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatINR = (amount) => formatCurrency(amount, 'INR');

  // Use centralized date format helpers (dd/mm/yyyy)
  // Delegates to `formatDate` / `formatDateTime` from utils

  if (loading && !selectedEditor && activeTab === 'editor') {
    return <div className="spinner"></div>;
  }

  const editorPendingPayments = editorPayments.filter(p => !p.paid);
  const editorPendingTotal = calculateTotal(editorPendingPayments);

  return (
    <div className="container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Payment Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowManualModal(true)}
        >
          + Add Manual Adjustment/Bonus
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '20px' }}>
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Financial Overview
        </button>
        <button
          className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          Amount to Settle for Editor
        </button>
        <button
          className={`tab ${activeTab === 'client' ? 'active' : ''}`}
          onClick={() => setActiveTab('client')}
        >
          Amount to be Paid by Client
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Transaction History
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="overview-container">
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '15px' }}>
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={statsMonth}
              onChange={(e) => setStatsMonth(parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={statsYear}
              onChange={(e) => setStatsYear(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="spinner"></div>
          ) : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {Object.keys(stats.currencies || { INR: stats }).map(curr => {
                const s = (stats.currencies && stats.currencies[curr]) || stats;
                return (
                  <React.Fragment key={curr}>
                    {/* Header for currency if multiple exist */}
                    {Object.keys(stats.currencies || {}).length > 1 && (
                      <h2 style={{ gridColumn: '1/-1', margin: '20px 0 10px', padding: '10px 0', borderBottom: '2px solid #eee' }}>{curr} Summary</h2>
                    )}

                    <div className="card overview-card" style={{ borderLeft: '5px solid #28a745' }}>
                      <div className="card-body">
                        <h3 style={{ color: '#28a745', marginTop: 0 }}>Revenue ({curr})</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span>Selected Month:</span>
                          <strong>{formatCurrency(s.monthlyRevenue, curr)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em' }}>
                          <span>Total All Time:</span>
                          <strong>{formatCurrency(s.totalRevenue, curr)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="card overview-card" style={{ borderLeft: '5px solid #dc3545' }}>
                      <div className="card-body">
                        <h3 style={{ color: '#dc3545', marginTop: 0 }}>Expenses ({curr})</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span>Selected Month:</span>
                          <strong>{formatCurrency(s.monthlyExpenses, curr)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em' }}>
                          <span>Total All Time:</span>
                          <strong>{formatCurrency(s.totalExpenses, curr)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="card overview-card" style={{ borderLeft: '5px solid #007bff' }}>
                      <div className="card-body">
                        <h3 style={{ color: '#007bff', marginTop: 0 }}>Profit ({curr})</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span>Selected Month:</span>
                          <strong style={{ color: s.monthlyNetProfit >= 0 ? '#28a745' : '#dc3545' }}>
                            {formatCurrency(s.monthlyNetProfit, curr)}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em' }}>
                          <span>Total All Time:</span>
                          <strong style={{ color: s.netProfit >= 0 ? '#28a745' : '#dc3545' }}>
                            {formatCurrency(s.netProfit, curr)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="card overview-card" style={{ borderLeft: '5px solid #ffc107', gridColumn: '1 / -1' }}>
                      <div className="card-body">
                        <h3 style={{ color: '#ffc107', marginTop: 0 }}>Pending Settlements ({curr})</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'center', padding: '10px' }}>
                            <div style={{ fontSize: '0.9em', color: '#666' }}>Pending from Clients</div>
                            <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{formatCurrency(s.pendingClientIncome, curr)}</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '10px', borderLeft: '1px solid #eee' }}>
                            <div style={{ fontSize: '0.9em', color: '#666' }}>Pending to Editors</div>
                            <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{formatCurrency(s.pendingEditorPayout, curr)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <p className="text-center">No statistics available.</p>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="card-title">Transaction History</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={historyFilter.period}
                onChange={(e) => setHistoryFilter({ ...historyFilter, period: e.target.value })}
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={historyFilter.type}
                onChange={(e) => setHistoryFilter({ ...historyFilter, type: e.target.value })}
              >
                <option value="all">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
              </select>
              <button className="btn btn-secondary" onClick={exportToCSV}>Export CSV</button>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="spinner"></div>
            ) : historyPayments.length === 0 ? (
              <p className="text-center">No transactions found for these filters.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Project</th>
                      <th>Party</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyPayments.map(payment => {
                      const isIncome = payment.paymentType === 'client_charge';
                      const date = isIncome ? payment.receivedAt : payment.paidAt;

                      const rawAmount = payment.finalAmount || payment.originalAmount || 0;
                      // Client charges are positive flow (+). Editor payments/bonuses/deductions are negative flow (-) relative to admin wallet.
                      // Note: Deduction is stored as negative amount, so -( -200 ) = +200 (Flows back to admin).
                      const netAmount = isIncome ? rawAmount : -rawAmount;

                      return (
                        <tr key={payment._id}>
                          <td>{formatDate(date)}</td>
                          <td>
                            <span className={`badge badge-${netAmount >= 0 ? 'success' : 'danger'}`}>
                              {payment.paymentType === 'client_charge' ? 'Income' :
                                payment.paymentType === 'deduction' ? 'Adjustment' : 'Expense'}
                            </span>
                          </td>
                          <td>{payment.project?.title || 'N/A'}</td>
                          <td>
                            {isIncome ? (
                              <span>Client: {payment.client?.name}</span>
                            ) : (
                              <span>Editor: {payment.editor?.name}</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 'bold', color: netAmount >= 0 ? '#28a745' : '#dc3545' }}>
                            {netAmount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netAmount), payment.project?.currency || 'INR')}
                          </td>
                          <td>
                            {payment.paymentScreenshot ? (
                              <a
                                href={`${API_BASE_URL}${payment.paymentScreenshot}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`badge badge-${netAmount >= 0 ? 'success' : 'danger'}`}
                                style={{ textDecoration: 'none', cursor: 'pointer' }}
                                title="Click to view proof"
                              >
                                ✓ {payment.paymentType === 'client_charge' ? 'Received' : 'Paid'} (Proof)
                              </a>
                            ) : (
                              <span style={{ color: '#666' }}>✓ Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Payments Tab */}
      {activeTab === 'editor' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Editor Payments (Monthly Settlements)</h2>
          </div>
          <div className="card-body">
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Select Editor</label>
              <select
                className="form-select"
                value={selectedEditor}
                onChange={(e) => setSelectedEditor(e.target.value)}
              >
                <option value="">Select an Editor</option>
                <option value="all">All Editors (Pending Payments)</option>
                {editors.map((editor) => (
                  <option key={editor._id} value={editor._id}>
                    {editor.name} ({editor.email})
                  </option>
                ))}
              </select>
            </div>

            {selectedEditor && (
              <>
                {loading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    {editorPayments.filter(p => !p.paid).length === 0 ? (
                      <p className="text-center">No pending payments for this editor.</p>
                    ) : (
                      <div className="settlement-container" style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <div>
                            <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>
                              Selected: {selectedPaymentIds.length} payments
                            </span>
                            <span style={{ marginLeft: '20px', fontSize: '1.2em', color: '#28a745', fontWeight: 'bold' }}>
                              Total: {(() => {
                                const selected = editorPayments.filter(p => selectedPaymentIds.includes(p._id));
                                const totals = selected.reduce((acc, p) => {
                                  const cur = p.currency || p.project?.currency || 'INR';
                                  acc[cur] = (acc[cur] || 0) + (p.finalAmount || p.originalAmount || 0);
                                  return acc;
                                }, {});
                                return Object.keys(totals).map(cur => formatCurrency(totals[cur], cur)).join(' + ');
                              })()}
                            </span>
                          </div>
                          <button
                            className="btn btn-primary"
                            disabled={selectedPaymentIds.length === 0}
                            onClick={() => {
                              const paymentsToSettlement = editorPayments.filter(p => selectedPaymentIds.includes(p._id));
                              setPaymentsToPay(paymentsToSettlement);
                              setBonusAmount('');
                              setDeductionAmount('');
                              setShowPayTotalModal(true);
                            }}
                          >
                            Proceed to Settle
                          </button>
                        </div>

                        <div className="table-responsive">
                          <table className="table">
                            <thead>
                              <tr>
                                <th style={{ width: '40px' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedPaymentIds.length === editorPayments.filter(p => !p.paid).length && editorPayments.filter(p => !p.paid).length > 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPaymentIds(editorPayments.filter(p => !p.paid).map(p => p._id));
                                      } else {
                                        setSelectedPaymentIds([]);
                                      }
                                    }}
                                  />
                                </th>
                                <th>Project Title</th>
                                {selectedEditor === 'all' && <th>Editor</th>}
                                <th>Work Type</th>
                                <th>Date</th>
                                <th>Base Amount</th>
                                <th>Penalty</th>
                                <th>Final Amount</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {editorPayments.filter(p => !p.paid).map((payment) => (
                                <tr
                                  key={payment._id}
                                  onClick={() => {
                                    if (selectedPaymentIds.includes(payment._id)) {
                                      setSelectedPaymentIds(selectedPaymentIds.filter(id => id !== payment._id));
                                    } else {
                                      setSelectedPaymentIds([...selectedPaymentIds, payment._id]);
                                    }
                                  }}
                                  style={{ cursor: 'pointer', backgroundColor: selectedPaymentIds.includes(payment._id) ? '#f0f7ff' : 'transparent' }}
                                >
                                  <td onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={selectedPaymentIds.includes(payment._id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPaymentIds([...selectedPaymentIds, payment._id]);
                                        } else {
                                          setSelectedPaymentIds(selectedPaymentIds.filter(id => id !== payment._id));
                                        }
                                      }}
                                    />
                                  </td>
                                  <td>{payment.project?.title || 'N/A'}</td>
                                  {selectedEditor === 'all' && <td>{payment.editor?.name}</td>}
                                  <td>{payment.workType}</td>
                                  <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                                  <td>{formatCurrency(payment.originalAmount, payment.currency || payment.project?.currency || 'INR')}</td>
                                  <td style={{ color: payment.penaltyAmount > 0 ? '#dc3545' : 'inherit', fontWeight: payment.penaltyAmount > 0 ? 'bold' : 'normal' }}>
                                    {payment.penaltyAmount > 0 ? `-${formatCurrency(payment.penaltyAmount, payment.currency || payment.project?.currency || 'INR')}` : '-'}
                                    {payment.deadlineCrossed && <div style={{ fontSize: '10px', color: '#dc3545' }}>Late: {payment.daysLate}d (20% penalty)</div>}
                                  </td>
                                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(payment.finalAmount || payment.originalAmount, payment.currency || payment.project?.currency || 'INR')}</td>
                                  <td><span className="badge badge-warning">Pending</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Client Payments Tab */}
      {activeTab === 'client' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Amount to be Paid by Client</h2>
          </div>
          <div className="card-body">
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Select Client</label>
              <select
                className="form-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="all">All Pending Payments</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                {Object.keys(groupedClientPayments).length === 0 ? (
                  <p className="text-center">No pending payments found for this selection.</p>
                ) : (
                  Object.values(groupedClientPayments).map((group, index) => {
                    const pendingReceiptPayments = group.payments.filter(p => p.paid && !p.received);
                    const pendingReceiptTotal = calculateTotal(pendingReceiptPayments);

                    return (
                      <div key={group.client._id} className="client-payment-group" style={{ marginBottom: '30px', border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h3>{group.client.name} <small style={{ color: '#777', fontSize: '0.8em' }}>({group.client.email})</small></h3>
                          {pendingReceiptPayments.length > 0 && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleMarkBulkClientReceived(pendingReceiptPayments)}
                            >
                              Mark All Verified (Total: {(pendingReceiptTotal).toFixed(2)})
                            </button>
                          )}
                        </div>

                        <div className="table-responsive">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Project</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Closed On</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.payments.map((payment) => (
                                <tr key={payment._id}>
                                  <td>{payment.project?.title || 'N/A'}</td>
                                  <td>
                                    {payment.project?.currency || 'INR'}{' '}
                                    {(payment.finalAmount || payment.originalAmount || 0).toFixed(2)}
                                  </td>
                                  <td>
                                    {payment.received ? (
                                      <span className="badge badge-success">
                                        ✓ Received
                                      </span>
                                    ) : payment.paid ? (
                                      payment.paymentScreenshot ? (
                                        <a
                                          href={`${API_BASE_URL}${payment.paymentScreenshot}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="badge badge-primary"
                                          style={{ textDecoration: 'none', cursor: 'pointer' }}
                                          title="Click to view proof"
                                        >
                                          💰 Paid
                                        </a>
                                      ) : (
                                        <span className="badge badge-primary">
                                          💰 Paid by Client
                                        </span>
                                      )
                                    ) : (
                                      <span className="badge badge-danger">
                                        ⏳ Pending
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {payment.project?.closedAt ? formatDate(payment.project.closedAt) : '-'}
                                  </td>
                                  <td>
                                    {payment.paid && !payment.received && (
                                      <button
                                        className="btn btn-xs btn-outline-success"
                                        onClick={() => handleMarkBulkClientReceived([payment])}
                                        title="Mark this specific payment as received"
                                      >
                                        Mark Received
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Bulk Pay Modal for Editor */}
      {showPayTotalModal && (
        <div className="modal-overlay" onClick={() => setShowPayTotalModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pay Amount to Editor</h2>
              <button className="modal-close" onClick={() => setShowPayTotalModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>You are about to mark <strong>{paymentsToPay.length}</strong> payments as paid.</p>

              {(() => {
                const penaltyTotals = paymentsToPay.reduce((acc, p) => {
                  if (p.penaltyAmount > 0) {
                    const cur = p.currency || p.project?.currency || 'INR';
                    acc[cur] = (acc[cur] || 0) + p.penaltyAmount;
                  }
                  return acc;
                }, {});

                const currencies = Object.keys(penaltyTotals);
                if (currencies.length === 0) return null;

                return (
                  <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff5f5', borderLeft: '4px solid #dc3545', borderRadius: '4px' }}>
                    <div style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '0.9em', marginBottom: '4px' }}>⚠️ Deadline Penalties Detected</div>
                    {currencies.map(cur => (
                      <div key={cur} style={{ fontSize: '0.85em', color: '#842029' }}>
                        Total Penalty ({cur}): <strong>{formatCurrency(penaltyTotals[cur], cur)}</strong>
                      </div>
                    ))}
                    <div style={{ fontSize: '0.8em', marginTop: '4px', fontStyle: 'italic' }}>* Penalties are pre-calculated based on submission delay (20% flat).</div>
                  </div>
                );
              })()}

              <p style={{ fontSize: '1.2em' }}>
                Total to Settle: <strong>
                  {(() => {
                    const totals = paymentsToPay.reduce((acc, p) => {
                      const cur = p.currency || p.project?.currency || 'INR';
                      acc[cur] = (acc[cur] || 0) + (p.finalAmount || p.originalAmount || 0);
                      return acc;
                    }, {});
                    return Object.keys(totals).map(cur => formatCurrency(totals[cur], cur)).join(' + ');
                  })()}
                </strong>
              </p>

              <div className="form-group">
                <label className="form-label">Total Payment Screenshot (Optional)</label>
                <input
                  type="file"
                  className="form-input"
                  accept="image/*"
                  onChange={(e) => setPaymentScreenshot(e.target.files[0])}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Bonus Amount (+)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Deduction Amount (-)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={deductionAmount}
                    onChange={(e) => setDeductionAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                  />
                </div>
              </div>

              <div style={{ marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
                {(() => {
                  const subTotals = paymentsToPay.reduce((acc, p) => {
                    const cur = p.currency || p.project?.currency || 'INR';
                    acc[cur] = (acc[cur] || 0) + (p.finalAmount || p.originalAmount || 0);
                    return acc;
                  }, {});

                  const currencies = Object.keys(subTotals);
                  const bonusVal = parseFloat(bonusAmount) || 0;
                  const deductionVal = parseFloat(deductionAmount) || 0;
                  const primaryCur = currencies[0] || 'INR';

                  return (
                    <>
                      {currencies.map(cur => (
                        <div key={cur} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Subtotal ({cur}):</span>
                          <span>{formatCurrency(subTotals[cur], cur)}</span>
                        </div>
                      ))}

                      {bonusVal > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#28a745' }}>
                          <span>Bonus ({primaryCur}):</span>
                          <span>+ {formatCurrency(bonusVal, primaryCur)}</span>
                        </div>
                      )}
                      {deductionVal > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc3545' }}>
                          <span>Deduction ({primaryCur}):</span>
                          <span>- {formatCurrency(deductionVal, primaryCur)}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', borderTop: '1px solid #ddd', paddingTop: '5px', fontWeight: 'bold', fontSize: '1.2em' }}>
                        <span>Final Total:</span>
                        <div style={{ textAlign: 'right' }}>
                          {currencies.map(cur => {
                            let total = subTotals[cur];
                            if (cur === primaryCur) {
                              total += bonusVal - deductionVal;
                            }
                            return (
                              <div key={cur}>{formatCurrency(total, cur)}</div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPayTotalModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handlePayTotalEditor}
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Modal */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Manual Adjustment</h2>
              <button className="modal-close" onClick={() => setShowManualModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateManualPayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={manualPaymentForm.paymentType}
                    onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, paymentType: e.target.value })}
                    required
                  >
                    <option value="bonus">Bonus (+)</option>
                    <option value="deduction">Deduction (-)</option>
                    <option value="editor_payout">Editor Payout</option>
                    <option value="client_charge">Client Charge</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Link to Project (for Currency context)</label>
                  <select
                    className="form-select"
                    value={manualPaymentForm.projectId}
                    onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, projectId: e.target.value })}
                    required
                  >
                    <option value="">Select Project</option>
                    {allProjects.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.title} ({p.currency})
                      </option>
                    ))}
                  </select>
                </div>

                {manualPaymentForm.paymentType === 'client_charge' ? (
                  <div className="form-group">
                    <label className="form-label">Client</label>
                    <select
                      className="form-select"
                      value={manualPaymentForm.clientId}
                      onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, clientId: e.target.value })}
                      required
                    >
                      <option value="">Select Client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Editor</label>
                    <select
                      className="form-select"
                      value={manualPaymentForm.editorId}
                      onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, editorId: e.target.value })}
                      required
                    >
                      <option value="">Select Editor</option>
                      {editors.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Description / Note</label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualPaymentForm.description}
                    onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, description: e.target.value })}
                    placeholder="e.g. Festival Bonus, Late Penalty Recovery"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    className="form-input"
                    value={manualPaymentForm.amount}
                    onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, amount: e.target.value })}
                    placeholder="0.00"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={manualPaymentForm.markAsPaid}
                      onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, markAsPaid: e.target.checked })}
                    />
                    Mark as Paid/Received immediately
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowManualModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentPage;
