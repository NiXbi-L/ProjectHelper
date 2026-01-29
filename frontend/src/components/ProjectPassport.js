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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';

const ProjectPassport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passportFile, setPassportFile] = useState(null);
  const [passportText, setPassportText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else {
        fetchProject();
      }
    }
  }, [id, isAuthenticated, authLoading, navigate]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/projects/${id}/`);
      setProject(response.data);
      setPassportText(response.data.passport_text || '');
    } catch (err) {
      setError('Ошибка при загрузке проекта');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      if (passportFile) {
        formData.append('passport', passportFile);
      }
      if (passportText) {
        formData.append('passport_text', passportText);
      }
      
      await axios.patch(`/api/projects/projects/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsEditing(false);
      setPassportFile(null);
      fetchProject();
      alert('Паспорт проекта сохранен');
    } catch (err) {
      alert('Ошибка при сохранении');
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!project.passport && !project.passport_url && !passportFile) {
      alert('Загрузите паспорт проекта (файл) перед отправкой');
      return;
    }
    if (!window.confirm('Отправить проект на проверку преподавателю?')) {
      return;
    }
    try {
      await axios.post(`/api/projects/projects/${id}/submit/`);
      fetchProject();
      alert('Проект отправлен на проверку');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка при отправке проекта');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      return;
    }
    try {
      await axios.post('/api/projects/project-comments/', {
        project: id,
        text: comment,
      });
      setComment('');
      fetchProject();
    } catch (err) {
      alert('Ошибка при добавлении комментария');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      submitted: 'info',
      approved: 'success',
      revision: 'warning',
      rejected: 'error',
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

  if (error || !project) {
    return <Alert severity="error">{error || 'Проект не найден'}</Alert>;
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 2 }}
      >
        Назад
      </Button>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">{project.name}</Typography>
        <Chip
          label={getStatusLabel(project.status)}
          color={getStatusColor(project.status)}
        />
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Паспорт проекта</Typography>
          {project.can_edit && !isEditing && (
            <Button
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
              variant="outlined"
            >
              Редактировать
            </Button>
          )}
        </Box>

        {isEditing ? (
          <Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Загрузить файл паспорта проекта:
              </Typography>
              <input
                type="file"
                onChange={(e) => setPassportFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.txt"
                style={{ marginBottom: '16px' }}
              />
              {passportFile && (
                <Typography variant="body2" color="text.secondary">
                  Выбран файл: {passportFile.name}
                </Typography>
              )}
              {project.passport_url && !passportFile && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Текущий файл: <a href={project.passport_url} target="_blank" rel="noopener noreferrer">Скачать</a>
                  </Typography>
                </Box>
              )}
            </Box>
            <TextField
              fullWidth
              multiline
              rows={5}
              value={passportText}
              onChange={(e) => setPassportText(e.target.value)}
              placeholder="Дополнительный текст паспорта проекта (опционально)..."
              sx={{ mb: 2 }}
            />
            <Box display="flex" gap={2}>
              <Button variant="contained" onClick={handleSave}>
                Сохранить
              </Button>
              <Button onClick={() => {
                setIsEditing(false);
                setPassportFile(null);
                setPassportText(project.passport_text || '');
              }}>
                Отмена
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            {project.passport_url ? (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Паспорт проекта загружен как файл:
                </Typography>
                <Button
                  variant="outlined"
                  href={project.passport_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mb: 2 }}
                >
                  Скачать паспорт проекта
                </Button>
                {project.passport_text && (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
                    {project.passport_text}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', minHeight: '200px' }}>
                {project.passport_text || 'Паспорт проекта не загружен'}
              </Typography>
            )}
          </Box>
        )}

        {project.can_submit && project.status === 'draft' && (
          <Box mt={2}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={!project.passport && !project.passport_url}
            >
              Отправить на проверку
            </Button>
          </Box>
        )}

        {project.status === 'revision' && project.can_submit && (
          <Box mt={2}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Проект возвращен на доработку. Внесите изменения и отправьте снова.
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          <CommentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          История комментариев
        </Typography>
        <List>
          {project.comments && project.comments.length > 0 ? (
            project.comments.map((comment, index) => (
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
                {index < project.comments.length - 1 && <Divider />}
              </React.Fragment>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Комментариев пока нет
            </Typography>
          )}
        </List>

        {project.status === 'submitted' && (
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
        )}
      </Paper>
    </Box>
  );
};

export default ProjectPassport;
