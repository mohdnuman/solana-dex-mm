import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Typography,
  Chip,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTaskSchema, useTaskValidation } from '../hooks/useTaskSchemas';
import type { SchemaField, ValidationError } from '../services/api';

interface DynamicTaskFormProps {
  taskType: string;
  onFormDataChange: (formData: any, isValid: boolean) => void;
  initialData?: any;
}

interface FieldState {
  value: any;
  error: string | null;
  touched: boolean;
}

const DynamicTaskForm: React.FC<DynamicTaskFormProps> = ({
  taskType,
  onFormDataChange,
  initialData = {}
}) => {
  const { schema, loading: schemaLoading, error: schemaError } = useTaskSchema(taskType);
  const { validateContext, validating } = useTaskValidation();
  
  const [formData, setFormData] = useState<{ [key: string]: FieldState }>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [hasValidated, setHasValidated] = useState(false);

  // Initialize form data when schema loads
  useEffect(() => {
    if (schema) {
      const newFormData: { [key: string]: FieldState } = {};
      
      Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
        const initialValue = initialData[fieldName] ?? getDefaultValue(fieldSchema);
        newFormData[fieldName] = {
          value: initialValue,
          error: null,
          touched: false
        };
      });
      
      setFormData(newFormData);
      setValidationErrors([]);
      setHasValidated(false);
    }
  }, [schema, initialData]);

  // Validate form whenever form data changes (but only after user interaction)
  useEffect(() => {
    if (schema && Object.keys(formData).length > 0) {
      // Only validate if at least one field has been touched
      const hasAnyTouchedField = Object.values(formData).some(field => field.touched);
      if (hasAnyTouchedField) {
        // Add a small delay to prevent interfering with typing
        const timeoutId = setTimeout(() => {
          validateForm();
        }, 300);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [formData, schema]);

  const getDefaultValue = (fieldSchema: SchemaField): any => {
    // Don't pre-fill with examples, let users fill fields themselves
    switch (fieldSchema.type) {
      case 'string':
        return '';
      case 'number':
        return '';
      case 'boolean':
        return false;
      case 'array':
        return [];
      default:
        return '';
    }
  };

  const validateForm = async () => {
    if (!schema || !taskType) return;

    // Create context object from form data
    const context: any = {};
    Object.entries(formData).forEach(([key, field]) => {
      context[key] = field.value;
    });

    try {
      const result = await validateContext(taskType, context);
      setValidationErrors(result.errors);
      setHasValidated(true);
      
      // Update field-level errors without overwriting form state
      setFormData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(fieldName => {
          const fieldError = result.errors.find(err => err.field === fieldName);
          updated[fieldName] = {
            ...updated[fieldName],
            error: fieldError?.message || null
          };
        });
        return updated;
      });
      
      // Notify parent component
      onFormDataChange(context, result.valid);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        value,
        touched: true
      }
    }));
  };

  const renderField = (fieldName: string, fieldSchema: SchemaField) => {
    const fieldState = formData[fieldName];
    if (!fieldState) return null;

    const { value, error, touched } = fieldState;
    const hasError = Boolean(error && touched);

    const baseProps = {
      fullWidth: true,
      margin: 'normal' as const,
      variant: 'outlined' as const,
      error: hasError,
      helperText: hasError ? error : fieldSchema.description
    };

    switch (fieldSchema.type) {
      case 'string':
        if (fieldSchema.enum) {
          return (
            <FormControl key={fieldName} {...baseProps}>
              <InputLabel required={fieldSchema.required}>
                {fieldName}
              </InputLabel>
              <Select
                value={value || ''}
                label={fieldName}
                onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                required={fieldSchema.required}
              >
                {fieldSchema.enum.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              {(hasError || fieldSchema.description) && (
                <FormHelperText>
                  {hasError ? error : fieldSchema.description}
                </FormHelperText>
              )}
            </FormControl>
          );
        }
        
        return (
          <TextField
            key={fieldName}
            label={fieldName}
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            required={fieldSchema.required}
            placeholder={fieldSchema.example ? String(fieldSchema.example) : undefined}
            {...baseProps}
          />
        );

      case 'number':
        return (
          <TextField
            key={fieldName}
            label={fieldName}
            type="number"
            value={value === null || value === undefined ? '' : String(value)}
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
            required={fieldSchema.required}
            inputProps={{
              min: fieldSchema.min,
              max: fieldSchema.max,
              step: 'any'
            }}
            placeholder={fieldSchema.example ? String(fieldSchema.example) : undefined}
            {...baseProps}
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            key={fieldName}
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography component="span">
                  {fieldName}
                  {fieldSchema.required && <span style={{ color: 'red' }}> *</span>}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  {fieldSchema.description}
                </Typography>
              </Box>
            }
            sx={{ width: '100%', mt: 2, mb: 1 }}
          />
        );

      default:
        return (
          <TextField
            key={fieldName}
            label={fieldName}
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            required={fieldSchema.required}
            placeholder={fieldSchema.example ? String(fieldSchema.example) : undefined}
            {...baseProps}
          />
        );
    }
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

  const generalErrors = validationErrors.filter(err => !Object.keys(schema).includes(err.field));

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.main', color: 'info.contrastText' }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <InfoIcon />
          <Typography variant="h6">
            {taskType} Task Configuration
          </Typography>
        </Box>
        <Typography variant="body2">
          Fill in the required fields below. All fields are validated in real-time.
        </Typography>
      </Paper>

      {generalErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Validation Errors:
          </Typography>
          {generalErrors.map((error, index) => (
            <Typography key={index} variant="body2">
              • {error.message}
            </Typography>
          ))}
        </Alert>
      )}

      <Box component="form" noValidate>
        {Object.entries(schema).map(([fieldName, fieldSchema]) => (
          <Box key={fieldName}>
            {renderField(fieldName, fieldSchema)}
          </Box>
        ))}
      </Box>

      {hasValidated && (
        <Box mt={3}>
          <Divider />
          <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                Validation Status:
              </Typography>
              <Chip
                label={validationErrors.length === 0 ? 'Valid' : `${validationErrors.length} Error(s)`}
                color={validationErrors.length === 0 ? 'success' : 'error'}
                size="small"
              />
            </Box>
            {validating && <CircularProgress size={16} />}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DynamicTaskForm;