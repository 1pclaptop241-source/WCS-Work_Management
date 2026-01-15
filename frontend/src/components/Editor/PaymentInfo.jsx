import { useEffect, useState } from 'react';
import { paymentsAPI, API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { formatDate } from '../../utils/formatDate';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  DollarSign,
  Calendar,
  Wallet,
  AlertTriangle,
  Check
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

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
    return <div className="flex h-[80vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
  }

  const pendingPayments = paymentData.filter(p => !p.received && p.paymentType !== 'bonus' && p.paymentType !== 'deduction');
  const historyPayments = paymentData.filter(p => p.received || p.paymentType === 'bonus' || p.paymentType === 'deduction');

  const displayedPayments = activeTab === 'pending' ? pendingPayments : historyPayments;

  return (
    <div className="container mx-auto p-4 md:p-8 pt-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Information</h1>
          <p className="text-muted-foreground mt-1">Track your earnings and payment status.</p>
        </div>
        <Button variant="outline" onClick={loadPayments} disabled={loading}>
          <Clock className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingPayments.reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || p.baseAmount || 0), 0))}</div>
            <p className="text-xs text-muted-foreground">{pendingPayments.length} payments pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(historyPayments.filter(p => p.received).reduce((sum, p) => sum + (p.finalAmount || p.originalAmount || p.baseAmount || 0), 0))}</div>
            <p className="text-xs text-muted-foreground">{historyPayments.filter(p => p.received).length} payments received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coming Soon</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Next payout cycle</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSelectedIds([]); }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingPayments.length})</TabsTrigger>
          <TabsTrigger value="history">History ({historyPayments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Pending Payments</CardTitle>
                <CardDescription>Payments that are approved but not yet received/verified by you.</CardDescription>
              </div>
              {pendingPayments.length > 0 && selectedIds.length > 0 && (
                <Button
                  onClick={handleBulkMarkReceived}
                  disabled={processingId === 'bulk'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processingId === 'bulk' ? 'Processing...' : `Mark ${selectedIds.length} Received`}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-4 text-green-500 opacity-50" />
                  <p>No pending payments found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedIds.length > 0 && selectedIds.length === pendingPayments.filter(p => p.paid).length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(pendingPayments.filter(p => p.paid).map(p => p._id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Work Type</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(payment._id)}
                            onCheckedChange={() => {
                              if (selectedIds.includes(payment._id)) {
                                setSelectedIds(selectedIds.filter(id => id !== payment._id));
                              } else {
                                setSelectedIds([...selectedIds, payment._id]);
                              }
                            }}
                            disabled={!payment.paid}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{payment.project?.title || 'N/A'}</TableCell>
                        <TableCell>{payment.workType || 'N/A'}</TableCell>
                        <TableCell>{formatDate(payment.deadline)}</TableCell>
                        <TableCell>
                          {payment.paid ? (
                            payment.paymentScreenshot ? (
                              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 flex w-fit items-center gap-1 cursor-pointer hover:bg-blue-100" asChild>
                                <a href={payment.paymentScreenshot} target="_blank" rel="noopener noreferrer">
                                  <CheckCircle2 className="h-3 w-3" /> Paid (Proof)
                                </a>
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">Paid</Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700 flex w-fit items-center gap-1">
                              <Clock className="h-3 w-3" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.finalAmount || payment.originalAmount || payment.baseAmount || 0, payment.project?.currency || 'INR')}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.paid && !payment.received && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleMarkReceived(payment._id)}
                              disabled={processingId === payment._id}
                            >
                              {processingId === payment._id ? 'Processing...' : 'Mark Received'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Past payments and deductions.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payment history available.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyPayments.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell className="font-medium">{payment.project?.title || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.workType || payment.paymentType}</Badge>
                        </TableCell>
                        <TableCell>
                          {payment.received ? (
                            <Badge className="bg-green-600 hover:bg-green-700">Received</Badge>
                          ) : (
                            <Badge variant="secondary">Applied</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(payment.paidAt || payment.updatedAt)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.finalAmount || payment.originalAmount || payment.baseAmount || 0, payment.project?.currency || 'INR')}
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

      {/* Payment Summary Footer */}
      {displayedPayments.length > 0 && (
        <Card className="mt-8 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
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

              return (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {Object.keys(totals).map(cur => (
                    <div key={cur} className="space-y-3 p-4 border rounded-lg bg-background">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Currency</span>
                        <Badge variant="outline">{cur}</Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span>Original:</span>
                        <span>{formatCurrency(totals[cur].original, cur)}</span>
                      </div>
                      {totals[cur].penalty > 0 && (
                        <div className="flex justify-between text-sm text-destructive">
                          <span>Penalties:</span>
                          <span>-{formatCurrency(totals[cur].penalty, cur)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>{formatCurrency(totals[cur].final, cur)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
export default PaymentInfo;

