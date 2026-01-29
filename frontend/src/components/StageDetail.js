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
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import CommentIcon from '@mui/icons-material/Comment';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const StageDetail = () => {
  const { projectId, stageId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [stage, setStage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else {
        fetchStage();
      }
    }
  }, [stageId, isAuthenticated, authLoading, navigate]);

  const fetchStage = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/stages/${stageId}/`);
      setStage(response.data);
    } catch (err) {
      setError('Ошибка при загрузке этапа');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('artifact', file);

    try {
      await axios.patch(`/api/projects/stages/${stageId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      fetchStage();
      alert('Артефакт загружен');
    } catch (err) {
      alert('Ошибка при загрузке артефакта');
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!stage.artifact) {
      alert('Загрузите артефакт этапа перед отправкой');
      return;
    }
    if (!window.confirm('Отправить этап на проверку преподавателю?')) {
      return;
    }
    try {
      await axios.post(`/api/projects/stages/${stageId}/submit/`);
      fetchStage();
      alert('Этап отправлен на проверку');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка при отправке этапа');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      return;
    }
    try {
      await axios.post('/api/projects/stage-comments/', {
        stage: stageId,
        text: comment,
      });
      setComment('');
      fetchStage();
    } catch (err) {
      alert('Ошибка при добавлении комментария');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      in_progress: 'default',
      submitted: 'info',
      approved: 'success',
      revision: 'warning',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      in_progress: 'В работе',
      submitted: 'На проверке',
      approved: 'Принято',
      revision: 'На доработке',
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

  if (error || !stage) {
    return <Alert severity="error">{error || 'Этап не найден'}</Alert>;
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/projects/${projectId}`)}
        sx={{ mb: 2 }}
      >
        Назад к проекту
      </Button>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">{stage.name}</Typography>
        <Chip
          label={getStatusLabel(stage.status)}
          color={getStatusColor(stage.status)}
        />
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Описание этапа
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
          {stage.description || 'Описание не указано'}
        </Typography>

        <Typography variant="h6" gutterBottom>
          Критерии приемки
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={5}
          value={stage.criteria || ''}
          onChange={async (e) => {
            try {
              await axios.patch(`/api/projects/stages/${stageId}/`, {
                criteria: e.target.value,
              });
              fetchStage();
            } catch (err) {
              console.error(err);
            }
          }}
          placeholder="Введите критерии приемки этапа..."
          sx={{ mb: 3 }}
        />

        <Typography variant="h6" gutterBottom>
          Артефакт этапа
        </Typography>
        {stage.artifact_url ? (
          <Box mb={2}>
            <Alert severity="success" sx={{ mb: 1 }}>
              <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Артефакт загружен
            </Alert>
            <Button
              href={stage.artifact_url}
              target="_blank"
              variant="outlined"
              sx={{ mr: 2 }}
            >
              Скачать артефакт
            </Button>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
            >
              Заменить
              <input
                type="file"
                hidden
                onChange={handleFileUpload}
              />
            </Button>
          </Box>
        ) : (
          <Box mb={2}>
            <Button
              component="label"
              variant="contained"
              startIcon={<UploadFileIcon />}
            >
              Загрузить артефакт
              <input
                type="file"
                hidden
                onChange={handleFileUpload}
              />
            </Button>
          </Box>
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          value={stage.artifact_description || ''}
          onChange={async (e) => {
            try {
              await axios.patch(`/api/projects/stages/${stageId}/`, {
                artifact_description: e.target.value,
              });
              fetchStage();
            } catch (err) {
              console.error(err);
            }
          }}
          placeholder="Описание артефакта..."
          sx={{ mb: 2 }}
        />

        {stage.deadline && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Дедлайн: {new Date(stage.deadline).toLocaleString('ru-RU')}
          </Typography>
        )}

        {stage.can_submit && stage.status === 'in_progress' && (
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={!stage.artifact}
          >
            Сдать этап на проверку
          </Button>
        )}

        {stage.status === 'revision' && stage.can_submit && (
          <Box mt={2}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Этап возвращен на доработку. Внесите изменения и отправьте снова.
            </Alert>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSubmit}
            >
              Отправить на проверку повторно
            </Button>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Задачи этапа
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate(`/projects/${projectId}/stages/${stageId}/tasks`)}
          sx={{ mb: 2 }}
        >
          Управление задачами
        </Button>
        <List>
          {stage.tasks && stage.tasks.length > 0 ? (
            stage.tasks.map((task) => (
              <ListItem key={task.id}>
                <ListItemText
                  primary={task.name}
                  secondary={
                    <Box>
                      <Chip
                        label={task.status === 'new' ? 'Новая' : 
                               task.status === 'in_progress' ? 'В работе' :
                               task.status === 'completed' ? 'Выполнена' : 'Возвращена'}
                        size="small"
                        color={task.status === 'completed' ? 'success' : 'default'}
                        sx={{ mr: 1 }}
                      />
                      {task.assigned_to && (
                        <Typography variant="caption" color="text.secondary">
                          Назначена: {task.assigned_to.email}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Задач пока нет
            </Typography>
          )}
        </List>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          <CommentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Комментарии
        </Typography>
        <List>
          {stage.comments && stage.comments.length > 0 ? (
            stage.comments.map((comment, index) => (
              <React.Fragment key={comment.id}>
                <ListItem>
                  <ListItemText
                    primary={comment.author.email}
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {comment.text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(comment.created_at).toLocaleString('ru-RU')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < stage.comments.length - 1 && <Divider />}
              </React.Fragment>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Комментариев пока нет
            </Typography>
          )}
        </List>

        <Box mt={2}>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Добавить комментарий..."
            sx={{ mb: 1 }}
          />
          <Button
            variant="outlined"
            onClick={handleAddComment}
            disabled={!comment.trim()}
          >
            Добавить комментарий
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default StageDetail;
