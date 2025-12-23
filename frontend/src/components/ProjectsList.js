import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const ProjectsList = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else {
        fetchProjects();
      }
    }
  }, [isAuthenticated, authLoading, navigate]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/projects/projects/');
      setProjects(response.data.results || response.data);
    } catch (err) {
      setError('Ошибка при загрузке проектов');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    const name = prompt('Введите название проекта:');
    if (name) {
      axios
        .post('/api/projects/projects/', { name, description: '' })
        .then(() => {
          fetchProjects();
        })
        .catch((err) => {
          alert('Ошибка при создании проекта');
          console.error(err);
        });
    }
  };

  if (authLoading || loading) {
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Мои проекты</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateProject}
        >
          Создать проект
        </Button>
      </Box>
      <Grid container spacing={3}>
        {projects.length === 0 ? (
          <Grid item xs={12}>
            <Typography variant="body1" color="text.secondary">
              У вас пока нет проектов. Создайте первый проект!
            </Typography>
          </Grid>
        ) : (
          projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {project.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {project.description || 'Нет описания'}
                  </Typography>
                  <Typography variant="caption" display="block" gutterBottom>
                    Участников: {project.members_count}
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate(`/projects/${project.id}`)}
                    sx={{ mt: 2 }}
                  >
                    Открыть проект
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default ProjectsList;



