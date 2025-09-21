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
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.main', color: 'info.contrastText' }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <InfoIcon />
          <Typography variant="h6">
            {taskType} Task Configuration (Simple)
          </Typography>
        </Box>
        <Typography variant="body2">
          Fill in the required fields below.
        </Typography>
      </Paper>

      <Box component="form" noValidate>
        {Object.entries(schema).map(([fieldName, fieldSchema]) => {
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
              </FormControl>
            );
          }

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

          return (
            <TextField
              key={fieldName}
              fullWidth
              margin="normal"
              label={fieldName}
              value={formData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              helperText={fieldSchema.description}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default SimpleTaskForm;