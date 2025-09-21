import { useState, useEffect } from 'react';
import { taskApi, type TaskSchema, type ValidationError } from '../services/api';

// Available task types from backend enum
const TASK_TYPES = ['MIXER', 'MAKER', 'HOLDER', 'VOLUME','SWEEP'];

export const useTaskSchemas = () => {
  const [schemas, setSchemas] = useState<{ [key: string]: TaskSchema }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchemas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch schemas for all task types individually
      const schemaPromises = TASK_TYPES.map(async (taskType) => {
        try {
          const data = await taskApi.getTaskSchema(taskType);
          return { taskType, schema: data.schema };
        } catch (err) {
          console.warn(`Failed to fetch schema for ${taskType}:`, err);
          return { taskType, schema: null };
        }
      });

      const results = await Promise.all(schemaPromises);
      const newSchemas: { [key: string]: TaskSchema } = {};
      
      results.forEach(({ taskType, schema }) => {
        if (schema) {
          newSchemas[taskType] = schema;
        }
      });

      setSchemas(newSchemas);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch schemas');
      console.error('Failed to fetch schemas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemas();
  }, []);

  return {
    schemas,
    taskTypes: TASK_TYPES,
    loading,
    error,
    refetch: fetchSchemas
  };
};

export const useTaskSchema = (taskType: string | null) => {
  const [schema, setSchema] = useState<TaskSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = async (type: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.getTaskSchema(type);
      setSchema(data.schema);
    } catch (err: any) {
      setError(err.message || `Failed to fetch schema for ${type}`);
      console.error(`Failed to fetch schema for ${type}:`, err);
      setSchema(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskType) {
      fetchSchema(taskType);
    } else {
      setSchema(null);
      setError(null);
    }
  }, [taskType]);

  return {
    schema,
    loading,
    error
  };
};

export const useTaskValidation = () => {
  const [validating, setValidating] = useState(false);

  const validateContext = async (taskType: string, context: any): Promise<{ valid: boolean, errors: ValidationError[] }> => {
    try {
      setValidating(true);
      const result = await taskApi.validateTaskContext(taskType, context);
      return result;
    } catch (err: any) {
      console.error('Validation failed:', err);
      return {
        valid: false,
        errors: [{ field: 'general', message: err.message || 'Validation failed' }]
      };
    } finally {
      setValidating(false);
    }
  };

  return {
    validateContext,
    validating
  };
};