import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import BlockIcon from '@mui/icons-material/Block';

const TasksKanban = () => {
  const { projectId, stageId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newTask, setNewTask] = useState({ name: '', description: '', deadline: '' });
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else {
        fetchTasks();
        fetchTeamMembers();
      }
    }
  }, [stageId, isAuthenticated, authLoading, navigate]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/tasks/?stage=${stageId}`);
      setTasks(Array.isArray(response.data.results) ? response.data.results : response.data);
    } catch (err) {
      setError('Ошибка при загрузке задач');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      // Получаем проект, чтобы узнать команду
      const projectResponse = await axios.get(`/api/projects/projects/${projectId}/`);
      const teamId = projectResponse.data.team;
      const teamResponse = await axios.get(`/api/projects/teams/${teamId}/`);
      setTeamMembers(teamResponse.data.team_members || []);
    } catch (err) {
      console.error('Ошибка при загрузке участников команды');
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.name.trim()) {
      alert('Введите название задачи');
      return;
    }
    try {
      await axios.post('/api/projects/tasks/', {
        stage: stageId,
        name: newTask.name,
        description: newTask.description,
        deadline: newTask.deadline || null,
      });
      setNewTask({ name: '', description: '', deadline: '' });
      setCreateDialogOpen(false);
      fetchTasks();
    } catch (err) {
      alert('Ошибка при создании задачи');
      console.error(err);
    }
  };

  const handleAssignTask = async () => {
    if (!selectedUserId) {
      alert('Выберите участника');
      return;
    }
    try {
      await axios.post(`/api/projects/tasks/${selectedTask.id}/assign/`, {
        user_id: selectedUserId,
      });
      setAssignDialogOpen(false);
      setSelectedTask(null);
      setSelectedUserId('');
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка при назначении задачи');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await axios.post(`/api/projects/tasks/${taskId}/complete/`);
      fetchTasks();
    } catch (err) {
      alert('Ошибка при завершении задачи');
    }
  };

  const handleReturnTask = async (taskId) => {
    const blocker = prompt('Укажите причину возврата (блокер):');
    if (blocker === null) return;
    try {
      await axios.post(`/api/projects/tasks/${taskId}/return_task/`, {
        blocker,
      });
      fetchTasks();
    } catch (err) {
      alert('Ошибка при возврате задачи');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axios.patch(`/api/projects/tasks/${taskId}/`, {
        status: newStatus,
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const statusColumns = [
    { id: 'new', label: 'Новые', color: 'default' },
    { id: 'in_progress', label: 'В работе', color: 'primary' },
    { id: 'completed', label: 'Выполнены', color: 'success' },
    { id: 'returned', label: 'Возвращены', color: 'warning' },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/projects/${projectId}/stages/${stageId}`)}
        sx={{ mb: 2 }}
      >
        Назад к этапу
      </Button>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Задачи этапа</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Создать задачу
        </Button>
      </Box>

      <Box display="flex" gap={2} sx={{ overflowX: 'auto', pb: 2 }}>
        {statusColumns.map((column) => (
          <Paper
            key={column.id}
            sx={{
              minWidth: 300,
              p: 2,
              bgcolor: 'grey.50',
            }}
          >
            <Typography variant="h6" gutterBottom>
              {column.label} ({getTasksByStatus(column.id).length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {getTasksByStatus(column.id).map((task) => (
                <Card key={task.id} sx={{ bgcolor: 'white' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {task.name}
                    </Typography>
                    {task.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {task.description}
                      </Typography>
                    )}
                    {task.assigned_to && (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <PersonIcon fontSize="small" />
                        <Typography variant="caption">
                          {task.assigned_to.email}
                        </Typography>
                      </Box>
                    )}
                    {task.deadline && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Дедлайн: {new Date(task.deadline).toLocaleDateString('ru-RU')}
                      </Typography>
                    )}
                    {task.blocker && (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <BlockIcon fontSize="small" color="error" />
                        <Typography variant="caption" color="error">
                          {task.blocker}
                        </Typography>
                      </Box>
                    )}
                    <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                      {task.assigned_to?.id === user?.id && task.status === 'in_progress' && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => handleCompleteTask(task.id)}
                          >
                            Завершить
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleReturnTask(task.id)}
                          >
                            Вернуть
                          </Button>
                        </>
                      )}
                      {!task.assigned_to && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedTask(task);
                            setAssignDialogOpen(true);
                          }}
                        >
                          Назначить
                        </Button>
                      )}
                      <Select
                        size="small"
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="new">Новая</MenuItem>
                        <MenuItem value="in_progress">В работе</MenuItem>
                        <MenuItem value="completed">Выполнена</MenuItem>
                        <MenuItem value="returned">Возвращена</MenuItem>
                      </Select>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать задачу</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название задачи"
            fullWidth
            value={newTask.name}
            onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Описание"
            fullWidth
            multiline
            rows={3}
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Дедлайн"
            type="datetime-local"
            fullWidth
            value={newTask.deadline}
            onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreateTask} variant="contained">
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
        <DialogTitle>Назначить задачу</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Участник</InputLabel>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              label="Участник"
            >
              {teamMembers
                .filter(m => m.is_confirmed)
                .map((member) => (
                  <MenuItem key={member.user.id} value={member.user.id}>
                    {member.user.email} ({member.role === 'team_leader' ? 'Тимлид' : 'Участник'})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAssignTask} variant="contained">
            Назначить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksKanban;
