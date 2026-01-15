import { useState, useEffect } from 'react';
import { paymentsAPI, API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { formatDate } from '../../utils/formatDate';
import { generateInvoice } from '../../utils/generateInvoice';
import confetti from 'canvas-confetti';
import {
  Download,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  DollarSign,
  IndianRupee,
  Euro,
  FileText,
  ExternalLink
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPaymentIds(pendingPayments.filter(p => !p.paid).map(p => p._id));
    } else {
      setSelectedPaymentIds([]);
    }
  };

  const handlePay = async () => {
    try {
      if (selectedPaymentIds.length === 0) {
        await showAlert('Please select at least one payment.', 'Validation Error');
        return;
      }

      await paymentsAPI.markBulkClientPaid(selectedPaymentIds, totalPaymentScreenshot);

      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        zIndex: 2100,
        colors: ['#28a745', '#85bb65', '#d4edda'],
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
    return <div className="flex h-[80vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 pt-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Payment Information</h1>
        <Button variant="outline" onClick={loadPayments} disabled={loading}>
          <Clock className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingPayments.reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || 0), 0))}</div>
            <p className="text-xs text-muted-foreground">{pendingPayments.length} invoices pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(historyPayments.reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || 0), 0))}</div>
            <p className="text-xs text-muted-foreground">{historyPayments.length} invoices paid</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingPayments.length})</TabsTrigger>
          <TabsTrigger value="history">History ({historyPayments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Pending Payments Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Payments to Admin</CardTitle>
                <CardDescription>Select payments to settle securely.</CardDescription>
              </div>
              {pendingPayments.length > 0 && selectedPaymentIds.length > 0 && (
                <Button onClick={() => setShowPayTotalModal(true)} className="bg-green-600 hover:bg-green-700">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Selected ({formatCurrency(amountToPay, payments[0]?.project?.currency || 'INR')})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-4 text-green-500 opacity-50" />
                  <p>No pending payments. You are all caught up!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedPaymentIds.length > 0 && selectedPaymentIds.length === pendingPayments.filter(p => !p.paid).length}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Closed Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment) => {
                      const isPending = !payment.paid && !payment.received;
                      return (
                        <TableRow key={payment._id}>
                          <TableCell>
                            {isPending && (
                              <Checkbox
                                checked={selectedPaymentIds.includes(payment._id)}
                                onCheckedChange={() => handleCheckboxChange(payment._id)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{payment.project?.title}</span>
                              <span className="text-xs text-muted-foreground">ID: {payment.invoiceId || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {payment.paid ? (
                              <div className="flex flex-col gap-2">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 w-fit">
                                  <Clock className="mr-1 h-3 w-3" /> Verifying
                                </Badge>
                                {payment.paymentScreenshot && (
                                  <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs justify-start">
                                    <a href={payment.paymentScreenshot} target="_blank" rel="noopener noreferrer">View Proof</a>
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs w-fit"
                                  onClick={() => {
                                    setSelectedPaymentForEdit(payment);
                                    setShowEditProofModal(true);
                                  }}
                                >
                                  Edit Proof
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="warning" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
                                <AlertCircle className="mr-1 h-3 w-3" /> Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{payment.project?.closedAt ? formatDate(payment.project.closedAt) : '-'}</TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(payment.finalAmount || payment.originalAmount || 0, payment.project?.currency || 'INR')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {pendingPayments.length > 0 && (
              <CardFooter className="bg-muted/50 flex justify-end py-4">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mr-2 inline">Total Pending:</div>
                  <span className="text-xl font-bold text-destructive">
                    {formatCurrency(pendingPayments.filter(p => !p.paid).reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || 0), 0), payments[0]?.project?.currency || 'INR')}
                  </span>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View your past transactions.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payment history available.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Paid Date</TableHead>
                      <TableHead>Closed Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyPayments.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell className="font-medium">{payment.project?.title}</TableCell>
                        <TableCell>
                          <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Paid
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.paidAt ? formatDate(payment.paidAt) : '-'}</TableCell>
                        <TableCell>{payment.project?.closedAt ? formatDate(payment.project.closedAt) : '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.finalAmount || payment.originalAmount || 0, payment.project?.currency || 'INR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pay Total Dialog */}
      <Dialog open={showPayTotalModal} onOpenChange={setShowPayTotalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Payment Proof</DialogTitle>
            <DialogDescription>
              You are ensuring payment for <strong>{paymentsToPay.length}</strong> items.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-muted rounded-md flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-xl font-bold">{formatCurrency(amountToPay, payments[0]?.project?.currency || 'INR')}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proof-upload">Upload Screenshot (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="proof-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setTotalPaymentScreenshot(e.target.files[0])}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Supported formats: JPG, PNG, PDF</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayTotalModal(false)}>Cancel</Button>
            <Button onClick={handlePay} className="bg-green-600 hover:bg-green-700">Submit Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Proof Dialog */}
      <Dialog open={showEditProofModal} onOpenChange={(open) => !isUpdatingProof && setShowEditProofModal(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Proof</DialogTitle>
            <DialogDescription>Updating proof for: <strong>{selectedPaymentForEdit?.project?.title}</strong></DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-proof">Upload New Screenshot</Label>
              <Input
                id="new-proof"
                type="file"
                accept="image/*"
                onChange={(e) => setNewProofFile(e.target.files[0])}
                disabled={isUpdatingProof}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProofModal(false)} disabled={isUpdatingProof}>Cancel</Button>
            <Button onClick={handleUpdateProof} disabled={isUpdatingProof}>
              {isUpdatingProof ? 'Updating...' : 'Update Proof'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPaymentPage;

