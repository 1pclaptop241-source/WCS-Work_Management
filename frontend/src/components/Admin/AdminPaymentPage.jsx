import React, { useState, useEffect } from 'react';
import { paymentsAPI, usersAPI, projectsAPI } from '../../services/api';
import { useDialog } from '../../context/DialogContext';
import { formatDate } from '../../utils/formatDate';
import confetti from 'canvas-confetti';
import {
  Download,
  Filter,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // We might need to check if we have this, or fallback to native input
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AdminPaymentPage = () => {
  const { showAlert } = useDialog();
  const [activeTab, setActiveTab] = useState('overview');
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
  const [paymentsToPay, setPaymentsToPay] = useState([]);
  const [bonusAmount, setBonusAmount] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [bonusNote, setBonusNote] = useState('Bonus');
  const [deductionNote, setDeductionNote] = useState('Deduction');

  // Manual Payment Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualPaymentForm, setManualPaymentForm] = useState({
    paymentType: 'bonus',
    editorId: '',
    clientId: '',
    projectId: '',
    amount: '',
    description: '',
    markAsPaid: true
  });

  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);

  useEffect(() => {
    loadEditors();
    loadClients();
    if (activeTab === 'overview') loadStats();
    if (activeTab === 'client') loadClientPayments();
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [historyFilter]);

  useEffect(() => {
    if (activeTab === 'overview') loadStats();
  }, [statsMonth, statsYear]);

  useEffect(() => {
    if (selectedEditor && activeTab === 'editor') loadEditorPayments();
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
      console.error(err);
    }
  };

  const loadClients = async () => {
    try {
      const response = await usersAPI.getClients();
      setClients(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEditorPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentsAPI.getByEditorForAdmin(selectedEditor);
      setEditorPayments(response.data);
      setSelectedPaymentIds([]);
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

  const getFilteredClientPayments = () => {
    let filtered = clientPayments.filter(p => !p.received);
    if (selectedClient !== 'all') {
      filtered = filtered.filter(p => p.client?._id === selectedClient);
    }
    return filtered;
  };

  const groupedClientPayments = getFilteredClientPayments().reduce((acc, payment) => {
    const clientId = payment.client?._id;
    if (!clientId) return acc;
    if (!acc[clientId]) {
      acc[clientId] = { client: payment.client, payments: [] };
    }
    acc[clientId].payments.push(payment);
    return acc;
  }, {});

  const handleMarkBulkClientReceived = async (paymentsToMark) => {
    try {
      const ids = paymentsToMark.map(p => p._id);
      await paymentsAPI.markBulkClientReceived(ids);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#85bb65']
      });

      await loadClientPayments();
      await showAlert(`Marked ${ids.length} payments as received`, 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark payments received');
    }
  };

  const handlePayTotalEditor = async () => {
    try {
      const ids = paymentsToPay.map(p => p._id);
      if (ids.length === 0) return;

      await paymentsAPI.markBulkPaid(ids, paymentScreenshot, {
        bonusAmount: parseFloat(bonusAmount) || 0,
        deductionAmount: parseFloat(deductionAmount) || 0,
        bonusNote,
        deductionNote,
        editorId: paymentsToPay[0]?.editor?._id || paymentsToPay[0]?.editor
      });

      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.9 },
        colors: ['#d4edda', '#c3e6cb'],
        startVelocity: 60,
        gravity: 0.5,
        scalar: 0.8,
        zIndex: 2100
      });

      setPaymentScreenshot(null);
      setShowPayTotalModal(false);
      setPaymentsToPay([]);
      setBonusAmount('');
      setDeductionAmount('');
      await loadEditorPayments();
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
      return [formatDate(date), type, p.project?.title || 'N/A', party || 'N/A', amount, 'Completed'];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'payment_history.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency }).format(amount);
  };

  const calculateTotal = (payments) => {
    return payments.reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || 0), 0);
  };

  if (loading && !selectedEditor && activeTab === 'editor') {
    return <div className="flex h-[80vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 pt-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Payment Management</h1>
        <Button onClick={() => setShowManualModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Manual Adjustment
        </Button>
      </div>

      {error && <div className="p-4 text-destructive bg-destructive/10 rounded-md">{error}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Financial Overview</TabsTrigger>
          <TabsTrigger value="editor">Editor Settlements</TabsTrigger>
          <TabsTrigger value="client">Client Invoices</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Filters */}
          <div className="flex justify-end gap-2">
            <Select value={statsMonth.toString()} onValueChange={(v) => setStatsMonth(parseInt(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>{new Date(0, i).toLocaleString('en-US', { month: 'long' })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statsYear.toString()} onValueChange={(v) => setStatsYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.keys(stats.currencies || { INR: stats }).map(curr => {
                const s = (stats.currencies && stats.currencies[curr]) || stats;
                return (
                  <React.Fragment key={curr}>
                    <h3 className="col-span-full text-lg font-semibold border-b pb-2 mt-4">{curr} Summary</h3>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(s.monthlyRevenue, curr)}</div>
                        <p className="text-xs text-muted-foreground">Total: {formatCurrency(s.totalRevenue, curr)}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(s.monthlyExpenses, curr)}</div>
                        <p className="text-xs text-muted-foreground">Total: {formatCurrency(s.totalExpenses, curr)}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${s.monthlyNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(s.monthlyNetProfit, curr)}
                        </div>
                        <p className="text-xs text-muted-foreground">Total: {formatCurrency(s.netProfit, curr)}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm font-medium">In: {formatCurrency(s.pendingClientIncome, curr)}</div>
                        <div className="text-sm font-medium text-destructive">Out: {formatCurrency(s.pendingEditorPayout, curr)}</div>
                      </CardContent>
                    </Card>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">No statistics available.</div>
          )}
        </TabsContent>

        <TabsContent value="editor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Editor Settlements</CardTitle>
              <CardDescription>Select an editor to view pending payments and settle balances.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedEditor} onValueChange={setSelectedEditor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Editor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Editors (Pending)</SelectItem>
                  {editors.map(e => <SelectItem key={e._id} value={e._id}>{e.name} ({e.email})</SelectItem>)}
                </SelectContent>
              </Select>

              {selectedEditor && (
                <>
                  {loading ? <div className="py-8 text-center">Loading...</div> : (
                    <>
                      {editorPayments.filter(p => !p.paid).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No pending payments found.</div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                            <div className="text-sm">
                              Selected: <span className="font-bold">{selectedPaymentIds.length}</span>
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              Total: {(() => {
                                const selected = editorPayments.filter(p => selectedPaymentIds.includes(p._id));
                                const totals = selected.reduce((acc, p) => {
                                  const cur = p.currency || p.project?.currency || 'INR';
                                  acc[cur] = (acc[cur] || 0) + (p.finalAmount || p.originalAmount || 0);
                                  return acc;
                                }, {});
                                return Object.keys(totals).length > 0 ? Object.keys(totals).map(cur => formatCurrency(totals[cur], cur)).join(' + ') : '0.00';
                              })()}
                            </div>
                            <Button
                              onClick={() => {
                                setPaymentsToPay(editorPayments.filter(p => selectedPaymentIds.includes(p._id)));
                                setBonusAmount('');
                                setDeductionAmount('');
                                setShowPayTotalModal(true);
                              }}
                              disabled={selectedPaymentIds.length === 0}
                            >
                              Proceed to Settle
                            </Button>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">
                                  <input
                                    type="checkbox"
                                    className="translate-y-0.5"
                                    checked={selectedPaymentIds.length === editorPayments.filter(p => !p.paid).length && editorPayments.filter(p => !p.paid).length > 0}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedPaymentIds(editorPayments.filter(p => !p.paid).map(p => p._id));
                                      else setSelectedPaymentIds([]);
                                    }}
                                  />
                                </TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Work Type</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Penalty</TableHead>
                                <TableHead>Final</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {editorPayments.filter(p => !p.paid).map(payment => (
                                <TableRow key={payment._id} className={selectedPaymentIds.includes(payment._id) ? "bg-muted/50" : ""}>
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={selectedPaymentIds.includes(payment._id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedPaymentIds([...selectedPaymentIds, payment._id]);
                                        else setSelectedPaymentIds(selectedPaymentIds.filter(id => id !== payment._id));
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>{payment.project?.title || 'N/A'}</TableCell>
                                  <TableCell>{payment.workType}</TableCell>
                                  <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                                  <TableCell>{formatCurrency(payment.originalAmount, payment.currency)}</TableCell>
                                  <TableCell className={payment.penaltyAmount > 0 ? "text-destructive font-bold" : ""}>
                                    {payment.penaltyAmount > 0 ? `-${formatCurrency(payment.penaltyAmount, payment.currency)}` : '-'}
                                  </TableCell>
                                  <TableCell className="font-bold">{formatCurrency(payment.finalAmount || payment.originalAmount, payment.currency)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Invoices</CardTitle>
              <CardDescription>Track and mark payments received from clients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients (Pending)</SelectItem>
                  {clients.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {loading ? <div className="spinner"></div> : (
                <>
                  {Object.keys(groupedClientPayments).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No pending invoices found.</div>
                  ) : (
                    Object.values(groupedClientPayments).map((group) => {
                      const pending = group.payments.filter(p => p.paid && !p.received);
                      const total = calculateTotal(pending);
                      if (pending.length === 0) return null;

                      return (
                        <Card key={group.client._id} className="border bg-muted/20">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <CardTitle className="text-base">{group.client.name}</CardTitle>
                                <CardDescription>{group.client.email}</CardDescription>
                              </div>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleMarkBulkClientReceived(pending)}
                              >
                                Mark Received ({total.toFixed(2)})
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Project</TableHead>
                                  <TableHead>Desc</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pending.map(p => (
                                  <TableRow key={p._id}>
                                    <TableCell>{p.project?.title}</TableCell>
                                    <TableCell>{p.description || 'Client Payment'}</TableCell>
                                    <TableCell>{formatDate(p.createdAt)}</TableCell>
                                    <TableCell className="font-bold">{formatCurrency(p.finalAmount || p.originalAmount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transaction History</CardTitle>
              <div className="flex gap-2">
                <Select value={historyFilter.period} onValueChange={(v) => setHistoryFilter({ ...historyFilter, period: v })}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyPayments.map(p => {
                    const isIncome = p.paymentType === 'client_charge';
                    const netAmount = isIncome ? (p.finalAmount || p.originalAmount) : -(p.finalAmount || p.originalAmount);
                    return (
                      <TableRow key={p._id}>
                        <TableCell>{formatDate(isIncome ? p.receivedAt : p.paidAt)}</TableCell>
                        <TableCell>
                          <Badge variant={isIncome ? "default" : "secondary"}>
                            {p.paymentType === 'client_charge' ? "Income" : "Expense"}
                          </Badge>
                        </TableCell>
                        <TableCell>{isIncome ? p.client?.name : p.editor?.name}</TableCell>
                        <TableCell className={netAmount >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                          {netAmount >= 0 ? "+" : ""}{formatCurrency(netAmount, p.project?.currency || 'INR')}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="border-green-500 text-green-600">Completed</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Pay Editor */}
      <Dialog open={showPayTotalModal} onOpenChange={setShowPayTotalModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Settle Payments</DialogTitle>
            <DialogDescription>Review and settle selected payments for {paymentsToPay[0]?.editor?.name || 'Editor'}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bonus Amount</Label>
                <Input type="number" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Deduction Amount</Label>
                <Input type="number" value={deductionAmount} onChange={e => setDeductionAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Upload Payment Screenshot</Label>
              <Input type="file" onChange={e => setPaymentScreenshot(e.target.files[0])} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPayTotalModal(false)}>Cancel</Button>
            <Button onClick={handlePayTotalEditor} className="bg-green-600 hover:bg-green-700">Confirm Settlement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Manual Payment */}
      <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manual Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={manualPaymentForm.paymentType} onValueChange={v => setManualPaymentForm({ ...manualPaymentForm, paymentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonus">Bonus (Expense)</SelectItem>
                  <SelectItem value="deduction">Deduction (Refund/Inc)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Editor</Label>
              <Select value={manualPaymentForm.editorId} onValueChange={v => setManualPaymentForm({ ...manualPaymentForm, editorId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Editor" /></SelectTrigger>
                <SelectContent>
                  {editors.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={manualPaymentForm.amount} onChange={e => setManualPaymentForm({ ...manualPaymentForm, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={manualPaymentForm.description} onChange={e => setManualPaymentForm({ ...manualPaymentForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowManualModal(false)}>Cancel</Button>
            <Button onClick={handleCreateManualPayment}>Create Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentPage;
