import { useState, useEffect, useMemo } from "react";
import { Comment, getComments } from "./CommentsFirebase";
import { addComment } from "./CommentsFirebase";
import { Comment as AntComment } from "@ant-design/compatible"
import { Avatar, Button, Collapse, Form, Input, List, Modal, Space, Typography } from "antd";
import TextArea from "antd/es/input/TextArea";
import { faUserTie } from '@fortawesome/free-solid-svg-icons';
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useStore from "./store";


library.add(faUserTie)



function CommentSystem({ scoreId }:
    { scoreId: string }
){
  const [scoreComments, setScoreComments] = useState<Comment[]|null>(null)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState(getUserInfo());
  const [newName, setNewName] = useState(userInfo.name);

  const showComments = useStore.use.showComments()
  const commentingElement = useStore.use.commentingElement()
  const setCommentingElement = useStore.use.setCommentingElement()


  const saveName = () => {
    if (newName.trim()) {
      const updatedInfo = {...userInfo, name: newName.trim()};
      localStorage.setItem('user_info', JSON.stringify(updatedInfo));
      setUserInfo(updatedInfo);
    }
  };

  const getCommentsForNote = (noteId: string) => {
    if (!scoreComments) return []
    return scoreComments.filter(comment => comment.noteId === noteId)
  }

  const getCommentsForMeasure = (measureId: string) => {
    if (!scoreComments) return []
    return scoreComments.filter(comment => comment.measureId === measureId)
  }

    const getCommentsForCommentingElement = () => {
      if (!commentingElement) return []

      return commentingElement?.type === 'note' ?
          getCommentsForNote(commentingElement.id)
        : getCommentsForMeasure(commentingElement.id);
    }


  async function loadComments() {
    setLoading(true);

    try {
      const allComments = await getComments(scoreId);
      setScoreComments(allComments);
    } catch (error) {
      console.error("Error loading comments for element:", error);
    } finally {
      setLoading(false);
    }
  }

  function getUserInfo() {
    let userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    if (!userInfo.id) {
      userInfo = {
        id: 'anon_' + Math.random().toString(36).substring(2, 15),
        name: 'Usuario ' + Math.floor(Math.random() * 1000),
        created: new Date().toISOString()
      };
      localStorage.setItem('user_info', JSON.stringify(userInfo));
    }
    return userInfo;
  }

  useEffect(() => {
      loadComments()

  }, [scoreId])



  const elementComments = useMemo(() =>
    getCommentsForCommentingElement(),
    [scoreComments, commentingElement])


  const handleSubmitComment = async () => {
    if (!newComment.trim() || !commentingElement) return

    saveName()

    try {
      const userInfo = getUserInfo()
      if (commentingElement.type === 'note') {
        await addComment(scoreId, "", commentingElement.id, userInfo.name, newComment)
      } else if (commentingElement.type === 'measure') {
        await addComment(scoreId, commentingElement.id, "", userInfo.name, newComment)
      }

      // Recargar comentarios - Force a reload of all comments
      const freshComments = await getComments(scoreId);
      setScoreComments(Array.isArray(freshComments) ? freshComments : []);

      setCommentingElement(null)
      setNewComment('');
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
  }


  const onClose = () => {
    setCommentingElement(null)
  }

  const getCommentChild = (comment: Comment, index: number) => {
   return  <AntComment
      key={index}
      author={comment.userName}
      avatar={ <Avatar size="small" icon={<FontAwesomeIcon icon={faUserTie} />} />}
      content={ <p> {comment.commentText} </p>
      }
    >
    </AntComment>
  }

  const syles = useMemo(() => {
    if (!scoreComments) return ""

    return scoreComments?.filter(comment => comment.noteId != undefined && comment.noteId != "").map(comment => `g#${comment.noteId}.note`)
       .join(", ") +  " { filter: drop-shadow(50px 50px 50px rgb(32, 178, 170));  } "
  }, [scoreComments])


  const titleCount = () => {
    if (!commentingElement) {
      return ""
    }
    if (elementComments.length === 0) {
      return "No hay comentarios"
    } else if (elementComments.length === 1) {
      return "Un comentario"
    } else {
      return `${elementComments.length} comentarios`
    }
  }

  const title = `${titleCount()} para la ${commentingElement?.label} (id ${commentingElement?.id})`

  const isSubmitDisabled = !newName?.trim() || !newComment?.trim();

  const addCommentWidgets = ( <>
        <Form.Item>
            <TextArea rows={4} onChange={(e) => setNewComment(e.target.value)} value={newComment} />
        </Form.Item>
        <Form.Item>
        <Space direction="horizontal" align="end">
            <span>Comentar como: </span>
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={userInfo.name}
            />
            </Space>
        </Form.Item>
        <Form.Item>
            <Button htmlType="submit" disabled={isSubmitDisabled} loading={loading} onClick={handleSubmitComment} type="primary">
                Enviar
            </Button>
        </Form.Item>
  </>)

  return (
    <div className="comment-system">
      { showComments ? <style>
        {`
            g.note { cursor: pointer; pointer-events: auto; }
            g.measure { cursor: pointer; pointer-events: auto; }

            ${syles}
        `}
      </style> : null }

      <Modal title={title}
              footer={null}
              open={showComments && commentingElement != null}
              onOk={onClose}
              onCancel={onClose}>
        <List style={{ marginBottom: "40px"}}>
          {elementComments.map((comment, i) => getCommentChild(comment, i))}
        </List>

        { elementComments.length > 0  ?
          <Collapse
                  size="large"
                  items={[{ key: commentingElement?.id || 1, label: 'Añadir nuevo comentario', children: addCommentWidgets  }]}>
          </Collapse> :
          <>
            <Form.Item>
              <Typography.Title level={5}>Añadir un comentario</Typography.Title>
            </Form.Item>
            {addCommentWidgets}
          </> }


      </Modal>
    </div>
  )
}


export default CommentSystem