import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Checkbox,
  FormControlLabel,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  DragIndicator,
  AttachFile,
  Comment,
  CheckCircle,
  Edit,
  Delete,
  Add,
  Close,
  Download,
} from '@mui/icons-material';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../context/AuthContext';

const COLUMN_NAMES = {
  column1: 'В работе',
  column2: 'На проверке',
  column3: 'Завершено',
};

function SortableCard({ project, onEdit, onDelete, onView, isTeacher }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{ mb: 2, cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <DragIndicator {...attributes} {...listeners} sx={{ mr: 1, cursor: 'grab' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {project.name}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {project.team_name}
        </Typography>
        {project.description && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            {project.description.substring(0, 100)}
            {project.description.length > 100 ? '...' : ''}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip label={project.status} size="small" color={project.status === 'approved' ? 'success' : 'default'} />
          {project.files_count > 0 && (
            <Chip icon={<AttachFile />} label={project.files_count} size="small" />
          )}
          {project.comments_count > 0 && (
            <Chip icon={<Comment />} label={project.comments_count} size="small" />
          )}
        </Box>
        {isTeacher && project.teacher_checks && project.teacher_checks.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {project.teacher_checks.map((check) => (
              <FormControlLabel
                key={check.id}
                control={<Checkbox checked={check.is_checked} disabled />}
                label={check.comment || 'Отмечено'}
                size="small"
              />
            ))}
          </Box>
        )}
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => onView(project.id)}>
          Открыть
        </Button>
        {onEdit && (
          <Button size="small" onClick={() => onEdit(project)}>
            <Edit />
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

function Column({ id, title, projects, onEdit, onDelete, onView, isTeacher }) {
  const sortableProjects = projects.map((p) => p.id);

  return (
    <Paper sx={{ p: 2, minHeight: '600px', width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
        {title} ({projects.length})
      </Typography>
      <SortableContext items={sortableProjects} strategy={verticalListSortingStrategy}>
        {projects.map((project) => (
          <SortableCard
            key={project.id}
            project={project}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            isTeacher={isTeacher}
          />
        ))}
      </SortableContext>
    </Paper>
  );
}

const ProjectsKanban = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState({ open: false, project: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, project: null });
  const [newComment, setNewComment] = useState('');
  const [newFile, setNewFile] = useState(null);
  const [checkDialog, setCheckDialog] = useState({ open: false, project: null, check: null });

  const isTeacher = user?.is_staff || user?.is_teacher;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects/projects/');
      // Обрабатываем ответ с пагинацией или без
      const projectsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching projects:', error);
      alert('Ошибка при загрузке проектов');
      setProjects([]); // Устанавливаем пустой массив при ошибке
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetail = async (projectId) => {
    try {
      const response = await axios.get(`/api/projects/projects/${projectId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project detail:', error);
      return null;
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const project = (Array.isArray(projects) ? projects : []).find((p) => p && p.id === active.id);
    if (!project) return;

    // Определяем новую колонку на основе контейнера
    let newColumn = project.kanban_column;
    const overElement = document.elementFromPoint(event.activatorEvent.clientX, event.activatorEvent.clientY);
    const columnElement = overElement?.closest('[data-column]');
    if (columnElement) {
      newColumn = columnElement.getAttribute('data-column');
    }

    // Находим порядок в новой колонке
    const columnProjects = (Array.isArray(projects) ? projects : []).filter((p) => p && p.kanban_column === newColumn);
    const overIndex = columnProjects.findIndex((p) => p.id === over.id);
    const newOrder = overIndex >= 0 ? overIndex : columnProjects.length;

    try {
      await axios.patch(`/api/projects/projects/${project.id}/move_card/`, {
        kanban_column: newColumn,
        order: newOrder,
      });

      // Обновляем локальное состояние
      setProjects((prev) => {
        const updated = prev.map((p) => {
          if (p.id === project.id) {
            return { ...p, kanban_column: newColumn, order: newOrder };
          }
          // Обновляем порядок в старой колонке
          if (p.kanban_column === project.kanban_column && p.order > project.order) {
            return { ...p, order: p.order - 1 };
          }
          // Обновляем порядок в новой колонке
          if (p.kanban_column === newColumn && p.id !== project.id && p.order >= newOrder) {
            return { ...p, order: p.order + 1 };
          }
          return p;
        });
        return updated;
      });
    } catch (error) {
      console.error('Error moving card:', error);
      alert('Ошибка при перемещении карточки');
      fetchProjects(); // Обновляем данные
    }
  };

  const handleEdit = (project) => {
    setEditDialog({ open: true, project });
  };

  const handleSaveEdit = async () => {
    const { project } = editDialog;
    try {
      await axios.patch(`/api/projects/projects/${project.id}/`, {
        name: project.name,
        description: project.description,
      });
      setEditDialog({ open: false, project: null });
      fetchProjects();
    } catch (error) {
      alert('Ошибка при сохранении');
    }
  };

  const handleView = async (projectId) => {
    const project = await fetchProjectDetail(projectId);
    if (project) {
      setDetailDialog({ open: true, project });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !detailDialog.project) return;

    try {
      await axios.post('/api/projects/project-comments/', {
        project: detailDialog.project.id,
        text: newComment,
      });
      setNewComment('');
      const updated = await fetchProjectDetail(detailDialog.project.id);
      setDetailDialog({ open: true, project: updated });
      fetchProjects();
    } catch (error) {
      alert('Ошибка при добавлении комментария');
    }
  };

  const handleFileUpload = async () => {
    if (!newFile || !detailDialog.project) return;

    const formData = new FormData();
    formData.append('project', detailDialog.project.id);
    formData.append('file', newFile);
    formData.append('name', newFile.name);

    try {
      await axios.post('/api/projects/project-files/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNewFile(null);
      const updated = await fetchProjectDetail(detailDialog.project.id);
      setDetailDialog({ open: true, project: updated });
      fetchProjects();
    } catch (error) {
      alert('Ошибка при загрузке файла');
    }
  };

  const handleToggleCheck = async (project) => {
    if (!isTeacher) return;

    try {
      // Получаем или создаем галочку
      let check = project.teacher_checks?.find((c) => c.teacher?.id === user.id);
      
      if (!check) {
        const response = await axios.post('/api/projects/project-checks/get_or_create/', {
          project: project.id,
        });
        check = response.data;
      }

      // Переключаем галочку
      await axios.patch(`/api/projects/project-checks/${check.id}/`, {
        is_checked: !check.is_checked,
      });

      const updated = await fetchProjectDetail(project.id);
      setDetailDialog({ open: true, project: updated });
      fetchProjects();
    } catch (error) {
      alert('Ошибка при обновлении галочки');
    }
  };

  const handleRequestRevision = async () => {
    if (!isTeacher || !detailDialog.project) return;

    const comment = prompt('Введите комментарий для доработки:');
    if (!comment) return;

    try {
      await axios.post(`/api/projects/projects/${detailDialog.project.id}/request_revision/`, {
        comment,
      });
      setDetailDialog({ open: false, project: null });
      fetchProjects();
      alert('Проект отправлен на доработку');
    } catch (error) {
      alert('Ошибка при отправке на доработку');
    }
  };

  const columns = ['column1', 'column2', 'column3'];

  if (loading) {
    return <Typography>Загрузка...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Канбан-доска проектов</Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Список проектов
        </Button>
      </Box>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Grid container spacing={3}>
          {columns.map((columnId) => {
            const columnProjects = (Array.isArray(projects) ? projects : [])
              .filter((p) => p && p.kanban_column === columnId)
              .sort((a, b) => (a.order || 0) - (b.order || 0));

            return (
              <Grid item xs={12} md={4} key={columnId}>
                <Box data-column={columnId}>
                  <Column
                    id={columnId}
                    title={COLUMN_NAMES[columnId]}
                    projects={columnProjects}
                    onEdit={handleEdit}
                    onView={handleView}
                    isTeacher={isTeacher}
                  />
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </DndContext>

      {/* Диалог редактирования */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, project: null })}>
        <DialogTitle>Редактировать проект</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={editDialog.project?.name || ''}
            onChange={(e) =>
              setEditDialog({
                ...editDialog,
                project: { ...editDialog.project, name: e.target.value },
              })
            }
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Описание"
            value={editDialog.project?.description || ''}
            onChange={(e) =>
              setEditDialog({
                ...editDialog,
                project: { ...editDialog.project, description: e.target.value },
              })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, project: null })}>Отмена</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог деталей проекта */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, project: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {detailDialog.project?.name}
            <IconButton onClick={() => setDetailDialog({ open: false, project: null })}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailDialog.project && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Команда:</strong> {detailDialog.project.team_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Описание:</strong> {detailDialog.project.description || 'Нет описания'}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Паспорт проекта:</strong> {detailDialog.project.passport || 'Не заполнен'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 1 }}>
                Файлы ({detailDialog.project.files?.length || 0})
              </Typography>
              <List>
                {detailDialog.project.files?.map((file) => (
                  <ListItem key={file.id}>
                    <ListItemIcon>
                      <AttachFile />
                    </ListItemIcon>
                    <ListItemText primary={file.name || file.file_url} />
                    <IconButton
                      onClick={() => window.open(file.file_url, '_blank')}
                      size="small"
                    >
                      <Download />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <input
                  type="file"
                  onChange={(e) => setNewFile(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outlined" component="span" startIcon={<AttachFile />}>
                    Прикрепить файл
                  </Button>
                </label>
                {newFile && (
                  <>
                    <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                      {newFile.name}
                    </Typography>
                    <Button variant="contained" size="small" onClick={handleFileUpload}>
                      Загрузить
                    </Button>
                  </>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 1 }}>
                Комментарии ({detailDialog.project.comments?.length || 0})
              </Typography>
              <List>
                {detailDialog.project.comments?.map((comment) => (
                  <ListItem key={comment.id}>
                    <ListItemText
                      primary={comment.author?.email}
                      secondary={comment.text}
                    />
                  </ListItem>
                ))}
              </List>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Добавить комментарий..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button variant="contained" onClick={handleAddComment}>
                  Отправить
                </Button>
              </Box>

              {isTeacher && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Отметки преподавателя
                  </Typography>
                  {detailDialog.project.teacher_checks?.map((check) => (
                    <Box key={check.id} sx={{ mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={check.is_checked}
                            onChange={() => handleToggleCheck(detailDialog.project)}
                          />
                        }
                        label={check.comment || 'Отмечено преподавателем'}
                      />
                    </Box>
                  ))}
                  {(!detailDialog.project.teacher_checks ||
                    detailDialog.project.teacher_checks.length === 0) && (
                    <Button
                      variant="outlined"
                      startIcon={<CheckCircle />}
                      onClick={() => handleToggleCheck(detailDialog.project)}
                    >
                      Добавить отметку
                    </Button>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={handleRequestRevision}
                    >
                      Отправить на доработку
                    </Button>
                  </Box>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, project: null })}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsKanban;
