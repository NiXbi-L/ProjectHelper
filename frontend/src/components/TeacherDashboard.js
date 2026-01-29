import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);
  const [pendingProjects, setPendingProjects] = useState([]);
  const [pendingStages, setPendingStages] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAction, setReviewAction] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (!user?.is_staff && !user?.is_teacher) {
        setError('У вас нет прав доступа к панели преподавателя');
        navigate('/');
      } else {
        fetchPendingItems();
      }
    }
  }, [isAuthenticated, authLoading, navigate, tab, user]);

  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      if (tab === 0) {
        const response = await axios.get('/api/projects/teacher-dashboard/pending_projects/');
        setPendingProjects(Array.isArray(response.data) ? response.data : []);
      } else {
        const response = await axios.get('/api/projects/teacher-dashboard/pending_stages/');
        setPendingStages(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('У вас нет прав доступа к панели преподавателя');
      } else {
        setError('Ошибка при загрузке данных');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (item, action) => {
    setSelectedItem(item);
    setReviewAction(action);
    setReviewComment('');
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedItem) return;

    try {
      const endpoint = tab === 0
        ? `/api/projects/projects/${selectedItem.id}/${reviewAction}/`
        : `/api/projects/stages/${selectedItem.id}/${reviewAction}/`;

      await axios.post(endpoint, {
        comment: reviewComment,
      });

      setReviewDialogOpen(false);
      setSelectedItem(null);
      setReviewComment('');
      fetchPendingItems();
      alert(tab === 0 ? 'Проект обработан' : 'Этап обработан');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка при обработке');
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      submitted: 'info',
      approved: 'success',
      revision: 'warning',
      rejected: 'error',
      in_progress: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Черновик',
      submitted: 'На проверке',
      approved: 'Принято',
      revision: 'На доработке',
      rejected: 'Отклонено',
      in_progress: 'В работе',
    };
    return labels[status] || status;
  };

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

  const pendingItems = tab === 0 ? pendingProjects : pendingStages;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Панель преподавателя
      </Typography>

      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label={`Проекты на проверке (${pendingProjects.length})`} />
        <Tab label={`Этапы на проверке (${pendingStages.length})`} />
      </Tabs>

      {pendingItems.length === 0 ? (
        <Alert severity="info">
          Нет {tab === 0 ? 'проектов' : 'этапов'} на проверке
        </Alert>
      ) : (
        <List>
          {pendingItems.map((item) => (
            <Paper key={item.id} sx={{ mb: 2, p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                <Box>
                  <Typography variant="h6">{item.name}</Typography>
                  {tab === 0 && item.team_name && (
                    <Typography variant="body2" color="text.secondary">
                      Команда: {item.team_name}
                    </Typography>
                  )}
                  {tab === 0 && item.passport && (
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      {item.passport.substring(0, 200)}...
                    </Typography>
                  )}
                  {tab === 1 && item.description && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {item.description.substring(0, 200)}...
                    </Typography>
                  )}
                  <Chip
                    label={getStatusLabel(item.status)}
                    color={getStatusColor(item.status)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleReview(item, 'approve')}
                  >
                    Принять
                  </Button>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<EditIcon />}
                    onClick={() => handleReview(item, 'request_revision')}
                  >
                    На доработку
                  </Button>
                  {tab === 0 && (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<CloseIcon />}
                      onClick={() => handleReview(item, 'reject')}
                    >
                      Отклонить
                    </Button>
                  )}
                </Box>
              </Box>
              {item.comments && item.comments.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Комментарии:
                  </Typography>
                  {item.comments.map((comment) => (
                    <Typography key={comment.id} variant="body2" sx={{ mb: 1 }}>
                      <strong>{comment.author.email}:</strong> {comment.text}
                    </Typography>
                  ))}
                </Box>
              )}
            </Paper>
          ))}
        </List>
      )}

      <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewAction === 'approve' ? 'Принять' :
           reviewAction === 'request_revision' ? 'Вернуть на доработку' :
           'Отклонить'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Комментарий (необязательно)"
            fullWidth
            multiline
            rows={4}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSubmitReview} variant="contained">
            {reviewAction === 'approve' ? 'Принять' :
             reviewAction === 'request_revision' ? 'Вернуть на доработку' :
             'Отклонить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherDashboard;
