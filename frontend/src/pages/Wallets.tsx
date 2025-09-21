import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItemText,
  Chip,
  IconButton,
  CircularProgress,
  Fade,
  Divider,
  Paper,
  ListItemButton,
  Collapse,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  AccountBalanceWallet,
  Token as TokenIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { walletApi, type WalletGroup, type Wallet } from '../services/api';

const WalletsPage: React.FC = () => {
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  const [groupWallets, setGroupWallets] = useState<{ [key: string]: Wallet[] }>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingWallets, setLoadingWallets] = useState<{ [key: string]: boolean }>({});
  const [formData, setFormData] = useState({ name: '', numberOfWallets: 10 });
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchWalletGroups = async () => {
    try {
      setLoading(true);
      const data = await walletApi.getWalletGroups();
      setWalletGroups(data.walletGroups);
    } catch (error) {
      console.error('Failed to fetch wallet groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletsForGroup = async (groupId: string) => {
    if (groupWallets[groupId]) return;
    
    try {
      setLoadingWallets(prev => ({ ...prev, [groupId]: true }));
      const data = await walletApi.getWalletsForGroup(groupId);
      setGroupWallets(prev => ({ ...prev, [groupId]: data.wallets }));
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
    } finally {
      setLoadingWallets(prev => ({ ...prev, [groupId]: false }));
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await walletApi.addWalletGroup(formData.name, formData.numberOfWallets);
      setShowCreateForm(false);
      setFormData({ name: '', numberOfWallets: 10 });
      fetchWalletGroups();
    } catch (error) {
      console.error('Failed to create wallet group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (groupId: string) => {
    try {
      const data = await walletApi.exportWalletGroup(groupId);
      const blob = new Blob([data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${groupId}_private_keys.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export wallet group:', error);
    }
  };

  const handleToggleGroup = (groupId: string) => {
    const isExpanded = expandedGroups[groupId];
    setExpandedGroups(prev => ({ ...prev, [groupId]: !isExpanded }));
    
    if (!isExpanded) {
      fetchWalletsForGroup(groupId);
    }
  };

  const handleCopyGroupId = async (groupId: string) => {
    try {
      await navigator.clipboard.writeText(groupId);
      setCopySuccess(true);
    } catch (error) {
      console.error('Failed to copy group ID:', error);
    }
  };

  useEffect(() => {
    fetchWalletGroups();
  }, []);

  if (loading && walletGroups.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Wallet Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchWalletGroups()}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateForm(true)}
            sx={{ borderRadius: 2 }}
          >
            Create Group
          </Button>
        </Box>
      </Box>

      <Dialog 
        open={showCreateForm} 
        onClose={() => setShowCreateForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Wallet Group</DialogTitle>
        <form onSubmit={handleCreateGroup}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Group Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Number of Wallets"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.numberOfWallets}
              onChange={(e) => setFormData({ ...formData, numberOfWallets: parseInt(e.target.value) })}
              inputProps={{ min: 1 }}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Card>
        <CardHeader 
          title="Wallet Groups" 
          avatar={<AccountBalanceWallet color="primary" />}
        />
        <CardContent>
          {walletGroups.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={8}>
              No wallet groups found
            </Typography>
          ) : (
            <List>
              {walletGroups.map((group, index) => (
                <Fade in={true} timeout={300 * (index + 1)} key={group._id}>
                  <Paper 
                    elevation={1}
                    sx={{ 
                      mb: 2, 
                      border: 1,
                      borderColor: 'divider',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <ListItemButton 
                      onClick={() => handleToggleGroup(group._id)}
                      sx={{ p: 2 }}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="h6" component="div">
                              {group.name}
                            </Typography>
                            <Tooltip title="Copy Group ID">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyGroupId(group._id);
                                }}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              fontFamily="monospace"
                              sx={{ fontSize: '0.75rem' }}
                            >
                              ID: {group._id.slice(0, 8)}...
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Chip 
                              label={`${group.numberOfWallets} wallets`} 
                              size="small" 
                              sx={{ mt: 1, mb: 2 }}
                            />
                            <Box display="flex" gap={2} mt={1}>
                              <Chip 
                                icon={<TokenIcon />}
                                label={`SOL: ${group.solBalance.toFixed(4)}`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip 
                                icon={<TokenIcon />}
                                label={`Token: ${group.tokenBalance.toFixed(4)}`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <Box display="flex" gap={1} alignItems="center">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(group._id);
                          }}
                          title="Export private keys"
                          color="secondary"
                        >
                          <DownloadIcon />
                        </IconButton>
                        {expandedGroups[group._id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </Box>
                    </ListItemButton>
                    
                    <Collapse in={expandedGroups[group._id]} timeout="auto" unmountOnExit>
                      <Box sx={{ px: 2, pb: 2 }}>
                        <Divider sx={{ mb: 2 }} />
                        {loadingWallets[group._id] ? (
                          <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress size={24} />
                          </Box>
                        ) : groupWallets[group._id]?.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                            No wallets found
                          </Typography>
                        ) : (
                          <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                            <List dense>
                              {groupWallets[group._id]?.map((wallet, walletIndex) => (
                                <Fade in={true} timeout={200 * (walletIndex + 1)} key={wallet.address}>
                                  <Paper sx={{ mb: 1, p: 1.5 }} variant="outlined">
                                    <Typography 
                                      variant="body2" 
                                      fontFamily="monospace" 
                                      sx={{ 
                                        wordBreak: 'break-all',
                                        mb: 1,
                                        fontSize: '0.75rem'
                                      }}
                                    >
                                      {wallet.address}
                                    </Typography>
                                    <Box display="flex" justifyContent="space-between" gap={1}>
                                      <Chip 
                                        icon={<TokenIcon />}
                                        label={`SOL: ${wallet.solBalance.toFixed(4)}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem' }}
                                      />
                                      <Chip 
                                        icon={<TokenIcon />}
                                        label={`Token: ${wallet.tokenBalance.toFixed(4)}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem' }}
                                      />
                                    </Box>
                                  </Paper>
                                </Fade>
                              ))}
                            </List>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </Paper>
                </Fade>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setCopySuccess(false)} severity="success" sx={{ width: '100%' }}>
          Group ID copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WalletsPage;