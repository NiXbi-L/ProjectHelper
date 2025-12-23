import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

const StageComments = ({ stageId, open, onClose }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && stageId) {
      fetchComments();
    }
  }, [open, stageId]);

  const fetchComments = async () => {
    try {
      const response = await axios.get(`/api/projects/comments/?stage=${stageId}`);
      setComments(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setLoading(true);
      await axios.post('/api/projects/comments/', {
        stage: stageId,
        text: newComment
      });
      setNewComment('');
      fetchComments();
    } catch (err) {
      alert('Ошибка при отправке комментария');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Комментарии к этапу</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, maxHeight: '400px', overflowY: 'auto' }}>
          {comments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Пока нет комментариев
            </Typography>
          ) : (
            <List>
              {comments.map((comment) => (
                <ListItem key={comment.id} alignItems="flex-start">
                  <ListItemText
                    primary={comment.author.email}
                    secondary={
                      <>
                        <Typography variant="body2" component="span">
                          {comment.text}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {new Date(comment.created_at).toLocaleString('ru-RU')}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Написать комментарий..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={sendComment}
            disabled={loading}
            startIcon={<SendIcon />}
          >
            Отправить
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StageComments;

