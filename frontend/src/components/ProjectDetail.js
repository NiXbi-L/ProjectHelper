import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
  ListItemIcon,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {
  Close,
} from '@mui/icons-material';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProjectKanban from './ProjectKanban';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passportDialog, setPassportDialog] = useState(false);
  const [stagesDialog, setStagesDialog] = useState(false);
  const { user } = useAuth();
  
  const isTeacher = user?.is_staff || user?.is_teacher;
  const isTeamLeader = project?.team?.team_members?.some(
    (m) => m.user?.id === user?.id && m.role === 'team_leader' && m.is_confirmed
  );
  const isTeamMember = project?.team?.team_members?.some(
    (m) => m.user?.id === user?.id && m.is_confirmed
  );

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
    } catch (err) {
      setError('Ошибка при загрузке проекта');
      console.error(err);
    } finally {
      setLoading(false);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
          >
            Назад
          </Button>
          <Typography variant="h4">{project.name}</Typography>
          <Chip
            label={getStatusLabel(project.status)}
            color={getStatusColor(project.status)}
          />
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<DescriptionIcon />}
            onClick={() => setPassportDialog(true)}
          >
            Паспорт проекта
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssignmentIcon />}
            onClick={() => setStagesDialog(true)}
          >
            Этапы ({project.stages?.length || 0})
          </Button>
        </Box>
      </Box>

      {/* Канбан-доска как основной интерфейс - всегда отображается */}
      {project && (
        <ProjectKanban
          projectId={id}
          isTeamLeader={isTeamLeader}
          isTeacher={isTeacher}
          isTeamMember={isTeamMember}
        />
      )}

      {/* Диалог паспорта проекта */}
      <Dialog
        open={passportDialog}
        onClose={() => setPassportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Паспорт проекта
            <IconButton onClick={() => setPassportDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
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
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
              {project.passport_text || 'Паспорт проекта не загружен'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPassportDialog(false)}>Закрыть</Button>
          <Button
            variant="contained"
            onClick={() => {
              setPassportDialog(false);
              navigate(`/projects/${id}/passport`);
            }}
          >
            Редактировать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог этапов проекта */}
      <Dialog
        open={stagesDialog}
        onClose={() => setStagesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Этапы проекта
            <IconButton onClick={() => setStagesDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {project.stages && project.stages.length > 0 ? (
            <List>
              {project.stages.map((stage) => (
                <Paper key={stage.id} sx={{ p: 2, mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6">{stage.name}</Typography>
                    <Chip
                      label={
                        stage.status === 'in_progress' ? 'В работе' :
                        stage.status === 'submitted' ? 'На проверке' :
                        stage.status === 'approved' ? 'Принято' : 'На доработке'
                      }
                      color={
                        stage.status === 'approved' ? 'success' :
                        stage.status === 'submitted' ? 'info' :
                        stage.status === 'revision' ? 'warning' : 'default'
                      }
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {stage.description}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setStagesDialog(false);
                      navigate(`/projects/${id}/stages/${stage.id}`);
                    }}
                    sx={{ mt: 1 }}
                  >
                    Открыть этап
                  </Button>
                </Paper>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              Этапы проекта будут созданы после принятия паспорта проекта преподавателем.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStagesDialog(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectDetail;
