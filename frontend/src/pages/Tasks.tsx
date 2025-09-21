import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Collapse,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment,
  PlayArrow,
  Pause,
  Stop,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Schema as SchemaIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { taskApi, type Task } from '../services/api';
import { useTaskSchemas } from '../hooks/useTaskSchemas';
// import DynamicTaskForm from '../components/DynamicTaskForm';
import SimpleTaskForm from '../components/SimpleTaskForm';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editContext, setEditContext] = useState<string>('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // New schema-based form state
  const [selectedTaskType, setSelectedTaskType] = useState<string>('VOLUME');
  const [schemaFormData, setSchemaFormData] = useState<any>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [formMode, setFormMode] = useState<'schema' | 'json'>('schema');
  const [jsonFormData, setJsonFormData] = useState('{}');

  const { taskTypes, loading: schemasLoading } = useTaskSchemas();
  const taskStatuses = ['ALL', 'RUNNING', 'PENDING', 'FAILED', 'COMPLETED', 'DELETED'];

  const fetchTasks = async (status?: string) => {
    try {
      setLoading(true);
      const data = await taskApi.getTasks(status === 'ALL' ? undefined : status);
      // Sort tasks by creation time in descending order (newest first)
      const sortedTasks = data.tasks.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTasks(sortedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      setLoading(true);
      setCreateError(null);

      let context: any;
      
      if (formMode === 'schema') {
        // If no fields have been touched yet, provide a helpful message
        if (Object.keys(schemaFormData).length === 0) {
          setCreateError('Please fill in the required fields to create the task.');
          return;
        }
        
        // If fields have been filled but validation failed, show validation errors
        if (!isFormValid) {
          setCreateError('Please fix all validation errors before creating the task.');
          return;
        }
        
        context = schemaFormData;
      } else {
        try {
          context = JSON.parse(jsonFormData);
        } catch {
          setCreateError('Invalid JSON in context field');
          return;
        }
      }
      
      await taskApi.createTask(selectedTaskType, context);
      
      // Reset form
      setShowCreateForm(false);
      setSchemaFormData({});
      setJsonFormData('{}');
      setIsFormValid(false);
      setCreateError(null);
      setFormMode('schema');
      
      fetchTasks(statusFilter);
    } catch (error: any) {
      console.error('Failed to create task:', error);
      setCreateError(error.response?.data?.error || error.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleSchemaFormChange = (data: any, valid: boolean) => {
    setSchemaFormData(data);
    setIsFormValid(valid);
  };


  const handleCloseCreateForm = () => {
    setShowCreateForm(false);
    setSchemaFormData({});
    setJsonFormData('{}');
    setIsFormValid(false);
    setCreateError(null);
    setFormMode('schema');
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await taskApi.deleteTask(taskId);
      fetchTasks(statusFilter);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleStopTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to stop this task?')) return;
    
    try {
      await taskApi.stopTask(taskId);
      fetchTasks(statusFilter);
    } catch (error) {
      console.error('Failed to stop task:', error);
    }
  };

  const handleResumeTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to resume this task?')) return;
    
    try {
      await taskApi.resumeTask(taskId);
      fetchTasks(statusFilter);
    } catch (error) {
      console.error('Failed to resume task:', error);
    }
  };

  const handleEditContext = (taskId: string, currentContext: any) => {
    setEditingTask(taskId);
    setEditContext(JSON.stringify(currentContext, null, 2));
  };

  const handleSaveContext = async (taskId: string) => {
    try {
      let context;
      try {
        context = JSON.parse(editContext);
      } catch {
        alert('Invalid JSON in context field');
        return;
      }
      
      await taskApi.updateTaskContext(taskId, context);
      setEditingTask(null);
      setEditContext('');
      setUpdateSuccess(true);
      fetchTasks(statusFilter);
    } catch (error) {
      console.error('Failed to update task context:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditContext('');
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedRow(expandedRow === taskId ? null : taskId);
  };

  const filteredTasks = statusFilter === 'ALL' ? tasks : tasks.filter(task => task.status === statusFilter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <PlayArrow />;
      case 'PENDING':
        return <Schedule />;
      case 'FAILED':
        return <ErrorIcon />;
      case 'COMPLETED':
        return <CheckCircle />;
      case 'DELETED':
        return <Pause />;
      default:
        return <Assignment />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      case 'COMPLETED':
        return 'info';
      case 'DELETED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'VOLUME':
        return 'secondary';
      case 'MAKER':
        return 'primary';
      case 'HOLDER':
        return 'info';
      case 'MIXER':
        return 'warning';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    fetchTasks(statusFilter);
  }, [statusFilter]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Task Management
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={statusFilter}
              label="Status Filter"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {taskStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchTasks(statusFilter)}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateForm(true)}
          >
            Create Task
          </Button>
        </Box>
      </Box>

      <Card>
        <CardHeader 
          title={`Tasks ${statusFilter !== 'ALL' ? `(${statusFilter})` : ''}`}
          avatar={<Assignment color="primary" />}
        />

        <Dialog 
          open={showCreateForm} 
          onClose={handleCloseCreateForm}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { minHeight: '80vh' } }}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Create New Task</Typography>
              <Box display="flex" gap={1}>
                <Chip
                  icon={<SchemaIcon />}
                  label="Form Mode"
                  onClick={() => setFormMode('schema')}
                  color={formMode === 'schema' ? 'primary' : 'default'}
                  variant={formMode === 'schema' ? 'filled' : 'outlined'}
                  clickable
                  size="small"
                />
                <Chip
                  icon={<CodeIcon />}
                  label="JSON Mode"
                  onClick={() => setFormMode('json')}
                  color={formMode === 'json' ? 'primary' : 'default'}
                  variant={formMode === 'json' ? 'filled' : 'outlined'}
                  clickable
                  size="small"
                />
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {createError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {createError}
              </Alert>
            )}

            <FormControl fullWidth margin="dense" sx={{ mb: 3 }}>
              <InputLabel>Task Type</InputLabel>
              <Select
                value={selectedTaskType}
                label="Task Type"
                onChange={(e) => setSelectedTaskType(e.target.value)}
                disabled={schemasLoading}
              >
                {taskTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {schemasLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : formMode === 'schema' ? (
              <SimpleTaskForm
                taskType={selectedTaskType}
                onFormDataChange={handleSchemaFormChange}
              />
            ) : (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Context (JSON):
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={12}
                  variant="outlined"
                  value={jsonFormData}
                  onChange={(e) => setJsonFormData(e.target.value)}
                  placeholder='{"key": "value"}'
                  sx={{ 
                    fontFamily: 'monospace',
                    '& .MuiInputBase-input': { fontSize: '0.875rem' }
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Enter the task configuration as valid JSON. Use the Form Mode for guided input with validation.
                </Typography>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseCreateForm} disabled={loading}>
              Cancel
            </Button>
            <Button 
              variant="contained"
              onClick={handleCreateTask}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
              size="large"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogActions>
        </Dialog>

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress size={48} />
          </Box>
        ) : filteredTasks.length === 0 ? (
          <Box py={8}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} tasks found
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Task ID</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTasks.map((task) => (
                  <React.Fragment key={task._id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleExpand(task._id)}
                        >
                          {expandedRow === task._id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={task.type}
                          color={getTypeColor(task.type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={task.status}
                          color={getStatusColor(task.status) as any}
                          icon={getStatusIcon(task.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          fontFamily="monospace"
                          sx={{ fontSize: '0.75rem' }}
                        >
                          {task._id.slice(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(task.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {task.startedAt && task.endedAt
                            ? `${Math.round((new Date(task.endedAt).getTime() - new Date(task.startedAt).getTime()) / 1000)}s`
                            : task.startedAt
                            ? `${Math.round((Date.now() - new Date(task.startedAt).getTime()) / 1000)}s`
                            : '-'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          {task.status === 'RUNNING' && (
                            <>
                              <Tooltip title="Stop Task">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={() => handleStopTask(task._id)}
                                >
                                  <Stop />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Context">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditContext(task._id, task.context)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {task.status === 'PENDING' && (
                            <Tooltip title="Resume Task">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleResumeTask(task._id)}
                              >
                                <PlayArrow />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(task.status === 'RUNNING' || task.status === 'PENDING') && (
                            <Tooltip title="Delete Task">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteTask(task._id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                        <Collapse in={expandedRow === task._id} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            {task.name && (
                              <Typography variant="subtitle2" gutterBottom>
                                <strong>Name:</strong> {task.name}
                              </Typography>
                            )}
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              <strong>Full ID:</strong> {task._id}
                            </Typography>
                            
                            {task.startedAt && (
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>Started:</strong> {new Date(task.startedAt).toLocaleString()}
                              </Typography>
                            )}
                            
                            {task.endedAt && (
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>Ended:</strong> {new Date(task.endedAt).toLocaleString()}
                              </Typography>
                            )}
                            
                            {task.failureReason && (
                              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                                <strong>Failure Reason:</strong> {task.failureReason}
                              </Alert>
                            )}
                            
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                              Context:
                            </Typography>
                            
                            {editingTask === task._id ? (
                              <Box sx={{ mt: 1 }}>
                                <TextField
                                  multiline
                                  rows={6}
                                  fullWidth
                                  value={editContext}
                                  onChange={(e) => setEditContext(e.target.value)}
                                  variant="outlined"
                                  sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                                />
                                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<SaveIcon />}
                                    onClick={() => handleSaveContext(task._id)}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<CancelIcon />}
                                    onClick={handleCancelEdit}
                                  >
                                    Cancel
                                  </Button>
                                </Box>
                              </Box>
                            ) : (
                              <Paper 
                                sx={{ 
                                  p: 2, 
                                  bgcolor: 'grey.100', 
                                  fontFamily: 'monospace',
                                  fontSize: '0.75rem',
                                  overflow: 'auto',
                                  maxHeight: 300
                                }}
                              >
                                <pre>{JSON.stringify(task.context, null, 2)}</pre>
                              </Paper>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Snackbar
        open={updateSuccess}
        autoHideDuration={3000}
        onClose={() => setUpdateSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setUpdateSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Task context updated successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TasksPage;