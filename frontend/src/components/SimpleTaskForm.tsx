import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTaskSchema } from '../hooks/useTaskSchemas';
import { walletApi, type WalletGroup } from '../services/api';

interface SimpleTaskFormProps {
  taskType: string;
  onFormDataChange: (formData: any, isValid: boolean) => void;
}

const SimpleTaskForm: React.FC<SimpleTaskFormProps> = ({
  taskType,
  onFormDataChange
}) => {
  const { schema, loading: schemaLoading, error: schemaError } = useTaskSchema(taskType);
  const [formData, setFormData] = useState<any>({});
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>([]);
  const [loadingWalletGroups, setLoadingWalletGroups] = useState(false);

  // Fetch wallet groups
  const fetchWalletGroups = async () => {
    try {
      setLoadingWalletGroups(true);
      const data = await walletApi.getWalletGroups();
      setWalletGroups(data.walletGroups);
    } catch (error) {
      console.error('Failed to fetch wallet groups:', error);
    } finally {
      setLoadingWalletGroups(false);
    }
  };

  // Initialize form data when schema loads
  useEffect(() => {
    if (schema) {
      const initialData: any = {};
      Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
        switch (fieldSchema.type) {
          case 'string':
            initialData[fieldName] = '';
            break;
          case 'number':
            initialData[fieldName] = '';
            break;
          case 'boolean':
            initialData[fieldName] = false;
            break;
          default:
            initialData[fieldName] = '';
        }
      });
      setFormData(initialData);
    }
  }, [schema]);

  // Fetch wallet groups when component loads
  useEffect(() => {
    fetchWalletGroups();
  }, []);

  // Notify parent when form data changes
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      onFormDataChange(formData, true); // For now, always valid
    }
  }, [formData, onFormDataChange]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value
    }));
  };

  if (schemaLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (schemaError) {
    return (
      <Alert severity="error">
        Failed to load schema: {schemaError}
      </Alert>
    );
  }

  if (!schema) {
    return (
      <Alert severity="info">
        Please select a task type to see the configuration form.
      </Alert>
    );
  }

  return (
    <Box>
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        backgroundColor: '#1976d2', 
        color: '#ffffff',
        border: '1px solid #e0e0e0'
      }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <InfoIcon sx={{ color: '#ffffff' }} />
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
            {taskType} Task Configuration
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#ffffff', opacity: 0.9 }}>
          Fill in the required fields below.
        </Typography>
      </Paper>

      <Box component="form" noValidate>
        {Object.entries(schema).map(([fieldName, fieldSchema]) => {
          // Special handling for walletGroupId - show as dropdown
          if (fieldName === 'walletGroupId') {
            return (
              <FormControl key={fieldName} fullWidth margin="normal">
                <InputLabel>Wallet Group</InputLabel>
                <Select
                  value={formData[fieldName] || ''}
                  label="Wallet Group"
                  onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                  disabled={loadingWalletGroups}
                >
                  {loadingWalletGroups ? (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Loading wallet groups...
                    </MenuItem>
                  ) : walletGroups.length === 0 ? (
                    <MenuItem disabled>No wallet groups available</MenuItem>
                  ) : (
                    walletGroups.map((group) => (
                      <MenuItem key={group._id} value={group._id} sx={{ py: 1.5 }}>
                        <Box sx={{ width: '100%' }}>
                          <Typography variant="body2" fontWeight={500}>
                            {group.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {group.numberOfWallets} wallets • SOL: {group.solBalance.toFixed(4)} • Token: {group.tokenBalance.toFixed(4)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }}>
                            ID: {group._id.slice(0, 8)}...
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
                {fieldSchema.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {fieldSchema.description}
                  </Typography>
                )}
              </FormControl>
            );
          }

          // Handle enum fields (like DEX selection)
          if (fieldSchema.type === 'string' && fieldSchema.enum) {
            return (
              <FormControl key={fieldName} fullWidth margin="normal">
                <InputLabel>{fieldName}</InputLabel>
                <Select
                  value={formData[fieldName] || ''}
                  label={fieldName}
                  onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                >
                  {fieldSchema.enum.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
                {fieldSchema.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {fieldSchema.description}
                  </Typography>
                )}
              </FormControl>
            );
          }

          // Handle number fields
          if (fieldSchema.type === 'number') {
            return (
              <TextField
                key={fieldName}
                fullWidth
                margin="normal"
                label={fieldName}
                type="number"
                value={formData[fieldName] || ''}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Allow empty string or valid number strings (including partial decimals like "0.")
                  if (inputValue === '' || inputValue === '-' || /^-?\d*\.?\d*$/.test(inputValue)) {
                    handleFieldChange(fieldName, inputValue === '' ? '' : inputValue);
                  }
                }}
                onBlur={(e) => {
                  // Convert to number on blur (when user finishes typing)
                  const inputValue = e.target.value;
                  if (inputValue !== '' && inputValue !== '-' && inputValue !== '.') {
                    const numValue = Number(inputValue);
                    if (!isNaN(numValue)) {
                      handleFieldChange(fieldName, numValue);
                    }
                  }
                }}
                helperText={fieldSchema.description}
                inputProps={{
                  min: fieldSchema.min,
                  max: fieldSchema.max,
                  step: 'any'
                }}
                placeholder={fieldSchema.example ? String(fieldSchema.example) : undefined}
              />
            );
          }

          // Handle other string fields
          return (
            <TextField
              key={fieldName}
              fullWidth
              margin="normal"
              label={fieldName}
              value={formData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              helperText={fieldSchema.description}
              placeholder={fieldSchema.example ? String(fieldSchema.example) : undefined}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default SimpleTaskForm;