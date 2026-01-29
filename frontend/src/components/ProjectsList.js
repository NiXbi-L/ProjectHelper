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
  Tabs,
  Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import FolderIcon from '@mui/icons-material/Folder';

const ProjectsList = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else {
        fetchData();
      }
    }
  }, [isAuthenticated, authLoading, navigate, tab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (tab === 0) {
        const response = await axios.get('/api/projects/teams/');
        setTeams(Array.isArray(response.data.results) ? response.data.results : response.data);
      } else {
        const response = await axios.get('/api/projects/projects/');
        setProjects(Array.isArray(response.data.results) ? response.data.results : response.data);
      }
    } catch (err) {
      setError('Ошибка при загрузке данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = () => {
    const name = prompt('Введите название команды:');
    if (name) {
      axios
        .post('/api/projects/teams/', { name })
        .then((response) => {
          navigate(`/teams/${response.data.id}`);
        })
        .catch((err) => {
          alert('Ошибка при создании команды');
          console.error(err);
        });
    }
  };

  const handleCreateProject = () => {
    const name = prompt('Введите название проекта:');
    if (!name) return;

    // Сначала нужно выбрать команду
    axios
      .get('/api/projects/teams/')
      .then((teamsResponse) => {
        const teamsList = Array.isArray(teamsResponse.data.results) 
          ? teamsResponse.data.results 
          : teamsResponse.data;
        
        if (teamsList.length === 0) {
          alert('Сначала создайте команду');
          return;
        }

        const teamOptions = teamsList
          .filter(t => t.is_member && t.team_members?.some(m => m.is_confirmed))
          .map(t => `${t.name} (ID: ${t.id})`)
          .join('\n');

        const teamId = prompt(`Выберите команду (ID):\n${teamOptions}`);
        if (!teamId) return;

        axios
          .post('/api/projects/projects/', { name, team: parseInt(teamId) })
          .then((response) => {
            navigate(`/projects/${response.data.id}`);
          })
          .catch((err) => {
            alert('Ошибка при создании проекта');
            console.error(err);
          });
      })
      .catch((err) => {
        alert('Ошибка при загрузке команд');
        console.error(err);
      });
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
      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab icon={<GroupIcon />} label="Команды" />
        <Tab icon={<FolderIcon />} label="Проекты" />
      </Tabs>

      {tab === 0 && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4">Мои команды</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateTeam}
            >
              Создать команду
            </Button>
          </Box>
          <Grid container spacing={3}>
            {teams.length === 0 ? (
              <Grid item xs={12}>
                <Typography variant="body1" color="text.secondary">
                  У вас пока нет команд. Создайте первую команду!
                </Typography>
              </Grid>
            ) : (
              teams.map((team) => (
                <Grid item xs={12} sm={6} md={4} key={team.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {team.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Участников: {team.members_count}
                      </Typography>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => navigate(`/teams/${team.id}`)}
                        sx={{ mt: 2 }}
                      >
                        Открыть команду
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </>
      )}

      {tab === 1 && (
        <>
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
                        Команда: {project.team_name}
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
        </>
      )}
    </Box>
  );
};

export default ProjectsList;
