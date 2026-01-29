import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
} from '@mui/material';
import {
  DragIndicator,
  AttachFile,
  Comment,
  CheckCircle,
  Edit,
  Add,
  Close,
  Download,
} from '@mui/icons-material';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../context/AuthContext';

const COLUMN_NAMES = {
  column1: 'В работе',
  column2: 'На проверке',
  column3: 'Завершено',
};

function SortableCard({ card, onEdit, onView, isTeacher }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
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
      sx={{ mb: 2, cursor: 'grab', '&:active': { cursor: 'grabbing' }, touchAction: 'none' }}
      {...attributes}
      {...listeners}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <DragIndicator sx={{ mr: 1, cursor: 'grab' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {card.title}
          </Typography>
        </Box>
        {card.description && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            {card.description.substring(0, 100)}
            {card.description.length > 100 ? '...' : ''}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {card.files_count > 0 && (
            <Chip icon={<AttachFile />} label={card.files_count} size="small" />
          )}
          {card.comments_count > 0 && (
            <Chip icon={<Comment />} label={card.comments_count} size="small" />
          )}
        </Box>
        {isTeacher && card.teacher_checks && card.teacher_checks.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {card.teacher_checks.map((check) => (
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
      <CardActions onClick={(e) => e.stopPropagation()}>
        <Button size="small" onClick={(e) => { e.stopPropagation(); onView(card.id); }}>
          Открыть
        </Button>
        {onEdit && (
          <Button size="small" onClick={(e) => { e.stopPropagation(); onEdit(card); }}>
            <Edit />
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

function Column({ id, title, cards, onEdit, onView, isTeacher }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${id}`,
  });

  return (
    <Paper 
      sx={{ 
        p: 2, 
        minHeight: '600px', 
        width: '100%',
        backgroundColor: isOver ? 'action.hover' : 'background.paper',
        transition: 'background-color 0.2s',
      }} 
      ref={setNodeRef}
    >
      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
        {title} ({cards.length})
      </Typography>
      {cards.map((card) => (
        <SortableCard
          key={card.id}
          card={card}
          onEdit={onEdit}
          onView={onView}
          isTeacher={isTeacher}
        />
      ))}
    </Paper>
  );
}

const ProjectKanban = ({ projectId, isTeamLeader, isTeacher, isTeamMember }) => {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [editDialog, setEditDialog] = useState({ open: false, card: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, card: null });
  const [newComment, setNewComment] = useState('');
  const [newFile, setNewFile] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Минимальное расстояние для начала перетаскивания (в пикселях)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCards();
  }, [projectId]);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`/api/projects/kanban-cards/?project=${projectId}`);
      const cardsData = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setCards(cardsData);
    } catch (err) {
      console.error('Error fetching cards:', err);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const card = cards.find((c) => c.id === active.id);
    if (!card) return;

    // Определяем целевую колонку
    let newColumn = card.column;
    let newOrder = 0;

    // Если over.id начинается с "column-", это колонка
    if (typeof over.id === 'string' && over.id.startsWith('column-')) {
      newColumn = over.id.replace('column-', '');
      const columnCards = cards.filter((c) => c.column === newColumn && c.id !== card.id);
      newOrder = columnCards.length;
    } else {
      // Если over.id - это ID другой карточки, определяем колонку по этой карточке
      const overCard = cards.find((c) => c.id === over.id);
      if (overCard) {
        newColumn = overCard.column;
        const columnCards = cards.filter((c) => c.column === newColumn && c.id !== card.id);
        const overIndex = columnCards.findIndex((c) => c.id === over.id);
        newOrder = overIndex >= 0 ? overIndex : columnCards.length;
      } else {
        return; // Не можем определить целевую колонку
      }
    }

    // Если колонка не изменилась, просто меняем порядок
    if (newColumn === card.column) {
      const columnCards = cards.filter((c) => c.column === card.column && c.id !== card.id);
      const overIndex = columnCards.findIndex((c) => c.id === over.id);
      if (overIndex >= 0) {
        newOrder = overIndex;
      }
    }

    try {
      await axios.patch(`/api/projects/kanban-cards/${card.id}/move/`, {
        column: newColumn,
        order: newOrder,
      });

      setCards((prev) => {
        const updated = prev.map((c) => {
          if (c.id === card.id) {
            return { ...c, column: newColumn, order: newOrder };
          }
          if (c.column === card.column && c.order > card.order) {
            return { ...c, order: c.order - 1 };
          }
          if (c.column === newColumn && c.id !== card.id && c.order >= newOrder) {
            return { ...c, order: c.order + 1 };
          }
          return c;
        });
        return updated;
      });
    } catch (error) {
      console.error('Error moving card:', error);
      alert('Ошибка при перемещении карточки');
      fetchCards();
    }
  };

  const handleCreateCard = async () => {
    const title = prompt('Введите название карточки:');
    if (!title) return;

    try {
      await axios.post('/api/projects/kanban-cards/', {
        project: projectId,
        title,
        description: '',
        column: 'column1',
        order: 0,
      });
      fetchCards();
    } catch (error) {
      alert('Ошибка при создании карточки. Только участники команды могут создавать карточки.');
    }
  };

  const handleView = async (cardId) => {
    try {
      const response = await axios.get(`/api/projects/kanban-cards/${cardId}/`);
      setDetailDialog({ open: true, card: response.data });
    } catch (error) {
      alert('Ошибка при загрузке карточки');
    }
  };

  const handleEdit = (card) => {
    setEditDialog({ open: true, card });
  };

  const handleSaveEdit = async () => {
    const { card } = editDialog;
    try {
      await axios.patch(`/api/projects/kanban-cards/${card.id}/`, {
        title: card.title,
        description: card.description,
      });
      setEditDialog({ open: false, card: null });
      fetchCards();
    } catch (error) {
      alert('Ошибка при сохранении');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !detailDialog.card) return;

    try {
      await axios.post('/api/projects/kanban-card-comments/', {
        card: detailDialog.card.id,
        text: newComment,
      });
      setNewComment('');
      const response = await axios.get(`/api/projects/kanban-cards/${detailDialog.card.id}/`);
      setDetailDialog({ open: true, card: response.data });
      fetchCards();
    } catch (error) {
      alert('Ошибка при добавлении комментария');
    }
  };

  const handleFileUpload = async () => {
    if (!newFile || !detailDialog.card) return;

    const formData = new FormData();
    formData.append('card', detailDialog.card.id);
    formData.append('file', newFile);
    formData.append('name', newFile.name);

    try {
      await axios.post('/api/projects/kanban-card-files/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNewFile(null);
      const response = await axios.get(`/api/projects/kanban-cards/${detailDialog.card.id}/`);
      setDetailDialog({ open: true, card: response.data });
      fetchCards();
    } catch (error) {
      alert('Ошибка при загрузке файла');
    }
  };

  const handleToggleCheck = async (card) => {
    if (!isTeacher) return;

    try {
      let check = card.teacher_checks?.find((c) => c.teacher?.id === user.id);
      
      if (!check) {
        const response = await axios.post('/api/projects/kanban-card-checks/get_or_create/', {
          card: card.id,
        });
        check = response.data;
      }

      await axios.patch(`/api/projects/kanban-card-checks/${check.id}/`, {
        is_checked: !check.is_checked,
      });

      const response = await axios.get(`/api/projects/kanban-cards/${card.id}/`);
      setDetailDialog({ open: true, card: response.data });
      fetchCards();
    } catch (error) {
      alert('Ошибка при обновлении галочки');
    }
  };

  const columns = ['column1', 'column2', 'column3'];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Канбан-доска проекта</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateCard}>
          Добавить карточку
        </Button>
      </Box>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <Grid container spacing={3}>
            {columns.map((columnId) => {
              const columnCards = (Array.isArray(cards) ? cards : [])
                .filter((c) => c && c.column === columnId)
                .sort((a, b) => (a.order || 0) - (b.order || 0));

              return (
                <Grid item xs={12} md={4} key={columnId}>
                  <Box data-column={columnId}>
                    <Column
                      id={columnId}
                      title={COLUMN_NAMES[columnId]}
                      cards={columnCards}
                      onEdit={handleEdit}
                      onView={handleView}
                      isTeacher={isTeacher}
                    />
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </SortableContext>
      </DndContext>

      {/* Диалог редактирования */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, card: null })}>
        <DialogTitle>Редактировать карточку</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={editDialog.card?.title || ''}
            onChange={(e) =>
              setEditDialog({
                ...editDialog,
                card: { ...editDialog.card, title: e.target.value },
              })
            }
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Описание"
            value={editDialog.card?.description || ''}
            onChange={(e) =>
              setEditDialog({
                ...editDialog,
                card: { ...editDialog.card, description: e.target.value },
              })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, card: null })}>Отмена</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог деталей карточки */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, card: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {detailDialog.card?.title}
            <IconButton onClick={() => setDetailDialog({ open: false, card: null })}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailDialog.card && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Описание:</strong> {detailDialog.card.description || 'Нет описания'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 1 }}>
                Файлы ({detailDialog.card.files?.length || 0})
              </Typography>
              <List>
                {detailDialog.card.files?.map((file) => (
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
                Комментарии ({detailDialog.card.comments?.length || 0})
              </Typography>
              <List>
                {detailDialog.card.comments?.map((comment) => (
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
                  {detailDialog.card.teacher_checks?.map((check) => (
                    <Box key={check.id} sx={{ mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={check.is_checked}
                            onChange={() => handleToggleCheck(detailDialog.card)}
                          />
                        }
                        label={check.comment || 'Отмечено преподавателем'}
                      />
                    </Box>
                  ))}
                  {(!detailDialog.card.teacher_checks ||
                    detailDialog.card.teacher_checks.length === 0) && (
                    <Button
                      variant="outlined"
                      startIcon={<CheckCircle />}
                      onClick={() => handleToggleCheck(detailDialog.card)}
                    >
                      Добавить отметку
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, card: null })}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectKanban;
