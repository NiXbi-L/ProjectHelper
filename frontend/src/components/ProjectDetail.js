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
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import StageComments from './StageComments';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [tab, setTab] = useState(0);
  const [stages, setStages] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else {
        fetchProject();
      }
    }
  }, [id, isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (project) {
      // Загружаем этапы отдельно, если их нет в ответе проекта
      if (project.stages && project.stages.length > 0) {
        setStages(project.stages);
      } else {
        fetchStages();
      }
    }
  }, [project]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/projects/${id}/enter/`);
      setProject(response.data);
    } catch (err) {
      setError('Ошибка при загрузке проекта');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    try {
      const response = await axios.get(`/api/projects/stages/?project=${id}`);
      const stagesData = response.data.results || response.data;
      setStages(Array.isArray(stagesData) ? stagesData : []);
    } catch (err) {
      console.error('Error fetching stages:', err);
      setStages([]);
    }
  };

  const toggleStageComplete = async (stageId) => {
    try {
      await axios.post(`/api/projects/stages/${stageId}/toggle_complete/`);
      fetchStages();
    } catch (err) {
      console.error('Error toggling stage:', err);
    }
  };

  const handleAddMember = async () => {
    if (!email) {
      alert('Введите email');
      return;
    }
    try {
      await axios.post(`/api/projects/projects/${id}/add_member/`, { email });
      setEmail('');
      fetchProject();
      alert('Участник добавлен');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка при добавлении участника');
    }
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
        Назад к проектам
      </Button>
      <Typography variant="h4" gutterBottom>
        {project.name}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {project.description || 'Нет описания'}
      </Typography>

      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Участники" />
        <Tab label="Этапы" />
      </Tabs>

      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Участники проекта
          </Typography>
          <List>
            {project.members?.map((member) => (
              <ListItem key={member.id}>
                <ListItemText
                  primary={member.user.email}
                  secondary={`Роль: ${member.role === 'owner' ? 'Владелец' : 'Участник'}`}
                />
              </ListItem>
            ))}
          </List>
          {project.is_owner && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Добавить участника
              </Typography>
              <Box display="flex" gap={2} sx={{ mt: 1 }}>
                <TextField
                  label="Email (@dvfu.ru)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Button variant="contained" onClick={handleAddMember}>
                  Добавить
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {tab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Этапы разработки проекта
          </Typography>
          {stages.length === 0 ? (
            <Alert severity="info">Этапы проекта будут созданы автоматически при создании проекта. Если этапы не отображаются, возможно они еще не созданы для этого проекта.</Alert>
          ) : (
            stages.map((stage) => (
              <Card key={stage.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={stage.is_completed}
                            onChange={() => toggleStageComplete(stage.id)}
                            icon={<RadioButtonUncheckedIcon />}
                            checkedIcon={<CheckCircleIcon />}
                          />
                        }
                        label={stage.name}
                      />
                      <Chip 
                        label={stage.stage_type} 
                        size="small" 
                        color={stage.is_completed ? 'success' : 'default'}
                      />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {stage.description}
                  </Typography>
                  
                  {stage.hints && stage.hints.length > 0 && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">
                          Подсказки ({stage.hints.length})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {stage.hints.map((hint) => (
                          <Box key={hint.id} sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {hint.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {hint.content}
                            </Typography>
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  )}
                  
                  <Box sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedStageId(stage.id);
                        setCommentsDialogOpen(true);
                      }}
                    >
                      Комментарии ({stage.comments_count || 0})
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      )}

      <StageComments
        stageId={selectedStageId}
        open={commentsDialogOpen}
        onClose={() => {
          setCommentsDialogOpen(false);
          setSelectedStageId(null);
          fetchStages();
        }}
      />
    </Box>
  );
};

export default ProjectDetail;
