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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newRole, setNewRole] = useState('member');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else {
        fetchTeam();
      }
    }
  }, [id, isAuthenticated, authLoading, navigate]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/teams/${id}/`);
      setTeam(response.data);
    } catch (err) {
      setError('Ошибка при загрузке команды');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!email) {
      alert('Введите email');
      return;
    }
    try {
      await axios.post(`/api/projects/teams/${id}/invite_member/`, { email });
      setEmail('');
      setInviteDialogOpen(false);
      fetchTeam();
      alert('Приглашение отправлено');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка при приглашении участника');
    }
  };

  const handleConfirmParticipation = async () => {
    try {
      await axios.post(`/api/projects/teams/${id}/confirm_participation/`);
      fetchTeam();
      alert('Участие подтверждено');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка при подтверждении участия');
    }
  };

  const handleAssignRole = async () => {
    try {
      await axios.post(`/api/projects/teams/${id}/assign_role/`, {
        user_id: selectedMember.user.id,
        role: newRole,
      });
      setRoleDialogOpen(false);
      setSelectedMember(null);
      fetchTeam();
      alert('Роль обновлена');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка при назначении роли');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !team) {
    return <Alert severity="error">{error || 'Команда не найдена'}</Alert>;
  }

  const currentMember = team.team_members?.find(m => m.user.id === user?.id);
  const needsConfirmation = currentMember && !currentMember.is_confirmed;

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 2 }}
      >
        Назад
      </Button>
      <Typography variant="h4" gutterBottom>
        {team.name}
      </Typography>

      {needsConfirmation && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Вас пригласили в команду. Подтвердите участие:
          <Button
            startIcon={<CheckCircleIcon />}
            onClick={handleConfirmParticipation}
            sx={{ ml: 2 }}
            variant="contained"
            size="small"
          >
            Подтвердить участие
          </Button>
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Участники команды</Typography>
          {team.is_team_leader && (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setInviteDialogOpen(true)}
            >
              Пригласить участника
            </Button>
          )}
        </Box>
        <List>
          {team.team_members?.map((member) => (
            <ListItem key={member.id}>
              <ListItemText
                primary={member.user.email}
                secondary={
                  <Box>
                    <Chip
                      label={member.role === 'team_leader' ? 'Тимлид' : 'Участник'}
                      size="small"
                      color={member.role === 'team_leader' ? 'primary' : 'default'}
                      sx={{ mr: 1 }}
                    />
                    {member.is_confirmed ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Подтверждено"
                        size="small"
                        color="success"
                      />
                    ) : (
                      <Chip
                        icon={<CancelIcon />}
                        label="Ожидает подтверждения"
                        size="small"
                        color="warning"
                      />
                    )}
                  </Box>
                }
              />
              {team.is_team_leader && member.role !== 'team_leader' && (
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedMember(member);
                    setNewRole('team_leader');
                    setRoleDialogOpen(true);
                  }}
                >
                  Назначить тимлидом
                </Button>
              )}
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
        <DialogTitle>Пригласить участника</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email (@dvfu.ru)"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleInviteMember} variant="contained">
            Пригласить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogTitle>Назначить роль</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Роль</InputLabel>
            <Select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              label="Роль"
            >
              <MenuItem value="team_leader">Тимлид</MenuItem>
              <MenuItem value="member">Участник</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAssignRole} variant="contained">
            Назначить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamDetail;
