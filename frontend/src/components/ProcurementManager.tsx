/**
 * Phase 8: PROCUREMENT Module
 * Frontend Procurement Manager Component
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  ShoppingCart as ShoppingCartIcon,
  Gavel as GavelIcon,
  RequestQuote as RequestQuoteIcon,
  LocalShipping as LocalShippingIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

enum POStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  SENT = "sent",
  ACKNOWLEDGED = "acknowledged",
  PARTIAL_DELIVERY = "partial_delivery",
  FULLY_DELIVERED = "fully_delivered",
  INVOICED = "invoiced",
  PAID = "paid",
  CANCELLED = "cancelled",
}

enum QuoteStatus {
  REQUESTED = "requested",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

enum TenderStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  CLOSED = "closed",
  EVALUATING = "evaluating",
  AWARDED = "awarded",
  CANCELLED = "cancelled",
}

interface LineItem {
  item_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  material_code?: string;
  total: number;
}

interface BillOfMaterials {
  bom_id: string;
  project_id: string;
  title: string;
  line_items: LineItem[];
  created_at: string;
  total_value: number;
}

interface PurchaseOrder {
  po_id: string;
  project_id: string;
  supplier_id: string;
  status: POStatus;
  line_items: LineItem[];
  total_value: number;
  created_at: string;
}

interface TenderPackage {
  tender_id: string;
  project_id: string;
  title: string;
  status: TenderStatus;
  closing_date: string;
  received_quotes: string[];
}

interface SupplierQuote {
  quote_id: string;
  project_id: string;
  supplier_id: string;
  status: QuoteStatus;
  total_value: number;
}

const ProcurementManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [tenders, setTenders] = useState<TenderPackage[]>([]);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);

  const tabs = [
    { label: 'Bill of Materials', icon: <ReceiptIcon /> },
    { label: 'Tenders', icon: <GavelIcon /> },
    { label: 'Quotations', icon: <RequestQuoteIcon /> },
    { label: 'Purchase Orders', icon: <ShoppingCartIcon /> },
    { label: 'Deliveries', icon: <LocalShippingIcon /> },
    { label: 'Budget Tracking', icon: <AccountBalanceWalletIcon /> },
  ];

  const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
    [POStatus.DRAFT]: 'default',
    [POStatus.PENDING_APPROVAL]: 'warning',
    [POStatus.APPROVED]: 'primary',
    [POStatus.SENT]: 'primary',
    [POStatus.PARTIAL_DELIVERY]: 'warning',
    [POStatus.FULLY_DELIVERED]: 'success',
    [POStatus.PAID]: 'success',
    [QuoteStatus.REQUESTED]: 'default',
    [QuoteStatus.SUBMITTED]: 'primary',
    [QuoteStatus.ACCEPTED]: 'success',
    [QuoteStatus.REJECTED]: 'error',
    [TenderStatus.DRAFT]: 'default',
    [TenderStatus.PUBLISHED]: 'primary',
    [TenderStatus.CLOSED]: 'warning',
    [TenderStatus.AWARDED]: 'success',
  };

  useEffect(() => {
    // Load mock data
    setBoms([
      {
        bom_id: "BOM-20260420-000001",
        project_id: "proj-123",
        title: "Main Structure Materials",
        line_items: [],
        created_at: new Date().toISOString(),
        total_value: 124560.75
      },
      {
        bom_id: "BOM-20260420-000002",
        project_id: "proj-123",
        title: "Site Works Package",
        line_items: [],
        created_at: new Date().toISOString(),
        total_value: 47250.00
      }
    ]);

    setPurchaseOrders([
      {
        po_id: "PO-20260420-000001",
        project_id: "proj-123",
        supplier_id: "supp-001",
        status: POStatus.APPROVED,
        line_items: [],
        total_value: 34600.50,
        created_at: new Date().toISOString()
      },
      {
        po_id: "PO-20260420-000002",
        project_id: "proj-123",
        supplier_id: "supp-004",
        status: POStatus.PARTIAL_DELIVERY,
        line_items: [],
        total_value: 18750.00,
        created_at: new Date().toISOString()
      }
    ]);

    setTenders([
      {
        tender_id: "TEN-20260420-000001",
        project_id: "proj-123",
        title: "Civil Works Package",
        status: TenderStatus.PUBLISHED,
        closing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        received_quotes: ['quo-001', 'quo-002']
      }
    ]);

    setQuotes([
      {
        quote_id: "QUO-20260420-000001",
        project_id: "proj-123",
        supplier_id: "supp-001",
        status: QuoteStatus.SUBMITTED,
        total_value: 89400.00
      },
      {
        quote_id: "QUO-20260420-000002",
        project_id: "proj-123",
        supplier_id: "supp-002",
        status: QuoteStatus.SUBMITTED,
        total_value: 86100.00
      }
    ]);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(value);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Procurement Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage Bill of Materials, Tenders, Quotations, Purchase Orders and Budget Tracking
      </Typography>

      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)} 
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {tabs.map((tab, index) => (
          <Tab 
            key={index} 
            label={tab.label} 
            icon={tab.icon} 
            iconPosition="start"
          />
        ))}
      </Tabs>

      {/* Bill of Materials Tab */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Bill of Materials</Typography>
            <Button variant="contained" startIcon={<ReceiptIcon />}>
              Generate BOM from Estimate
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>BOM ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {boms.map((bom) => (
                  <TableRow key={bom.bom_id} hover>
                    <TableCell>
                      <Box sx={{ fontWeight: 600 }}>{bom.bom_id}</Box>
                    </TableCell>
                    <TableCell>{bom.title}</TableCell>
                    <TableCell align="right">{formatCurrency(bom.total_value)}</TableCell>
                    <TableCell>{new Date(bom.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View">
                        <IconButton size="small"><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Create PO">
                        <IconButton size="small"><ShoppingCartIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tenders Tab */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Tender Packages</Typography>
            <Button variant="contained" startIcon={<GavelIcon />}>
              Create New Tender
            </Button>
          </Box>

          <Grid container spacing={3}>
            {tenders.map((tender) => (
              <Grid item xs={12} md={6} lg={4} key={tender.tender_id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h6">{tender.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{tender.tender_id}</Typography>
                      </Box>
                      <Chip label={tender.status.toUpperCase()} size="small" color={statusColors[tender.status]} />
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2">
                      Closing: {new Date(tender.closing_date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2">
                      Quotes Received: {tender.received_quotes.length}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button size="small">View</Button>
                      <Button size="small">Evaluate Quotes</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Quotations Tab */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Supplier Quotations</Typography>
            <Box sx={{ gap: 1, display: 'flex' }}>
              <Button variant="outlined" startIcon={<RequestQuoteIcon />}>
                Request Quote
              </Button>
              <Button variant="contained">
                Compare Quotes
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Quote ID</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.quote_id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{quote.quote_id}</TableCell>
                    <TableCell>{quote.supplier_id}</TableCell>
                    <TableCell>
                      <Chip label={quote.status.toUpperCase()} size="small" color={statusColors[quote.status]} />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(quote.total_value)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Accept">
                        <IconButton size="small" color="success"><CheckCircleIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="View">
                        <IconButton size="small"><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Purchase Orders</Typography>
            <Button variant="contained" startIcon={<ShoppingCartIcon />}>
              Create Purchase Order
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>PO #</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.po_id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{po.po_id}</TableCell>
                    <TableCell>{po.supplier_id}</TableCell>
                    <TableCell>
                      <Chip label={po.status.replace('_', ' ').toUpperCase()} size="small" color={statusColors[po.status]} />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(po.total_value)}</TableCell>
                    <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View">
                        <IconButton size="small"><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Record Delivery">
                        <IconButton size="small"><LocalShippingIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Deliveries Tab */}
      {activeTab === 4 && (
        <Box>
          <Typography variant="h6" gutterBottom>Delivery Schedule Management</Typography>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary">
              Record deliveries, track received items and manage delivery schedules.
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Budget Tracking Tab */}
      {activeTab === 5 && (
        <Box>
          <Typography variant="h6" gutterBottom>Budget Tracking</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent></CardContent>