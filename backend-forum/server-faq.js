/**
 * server-faq.js
 * Servidor API dedicado ao Fórum ManUp.
 * Roda na porta 3001 para não conflitar com o servidor de cadastro (3000).
 * Salva dados em 'forum-db.json'.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001; // PORTA DIFERENTE DO SEU OUTRO SERVIDOR
const DATA_FILE = path.join(__dirname, 'forum-db.json'); // NOME DE ARQUIVO ÚNICO

app.use(cors());
app.use(bodyParser.json());

// --- Funções de Banco de Dados (JSON) ---

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = { posts: [] };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData));
        return initialData;
    }
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- Rotas da API ---

// GET /api/posts (Listar com paginação)
app.get('/api/posts', (req, res) => {
    const { page = 0, limit = 10 } = req.query;
    const data = readData();
    
    // Ordena do mais novo para o mais antigo
    const sortedPosts = data.posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const startIndex = Number(page) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedPosts = sortedPosts.slice(startIndex, endIndex);
    
    res.json({
        posts: paginatedPosts,
        total: sortedPosts.length,
        hasMore: endIndex < sortedPosts.length
    });
});

// POST /api/posts (Criar post)
app.post('/api/posts', (req, res) => {
    const { text, authorName } = req.body; // authorName é opcional
    if (!text) return res.status(400).json({ error: "Texto obrigatório" });

    const data = readData();
    const newPost = {
        id: Date.now().toString(),
        text: text,
        author: authorName || "Anônimo",
        createdAt: new Date().toISOString(),
        likeCount: 0,
        replies: []
    };

    data.posts.push(newPost);
    saveData(data);
    res.status(201).json(newPost);
});

// POST /api/posts/:id/like (Dar like)
app.post('/api/posts/:id/like', (req, res) => {
    const { id } = req.params;
    const { increment } = req.body;
    
    const data = readData();
    const post = data.posts.find(p => p.id === id);

    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    if (increment) {
        post.likeCount = (post.likeCount || 0) + 1;
    } else {
        post.likeCount = Math.max(0, (post.likeCount || 0) - 1);
    }

    saveData(data);
    res.json({ likeCount: post.likeCount });
});

// POST /api/posts/:id/reply (Responder)
app.post('/api/posts/:id/reply', (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: "Texto obrigatório" });

    const data = readData();
    const post = data.posts.find(p => p.id === id);

    if (!post) return res.status(404).json({ error: "Post não encontrado" });

    if (!post.replies) post.replies = [];

    const newReply = {
        id: Date.now().toString(),
        text: text,
        createdAt: new Date().toISOString()
    };

    post.replies.push(newReply);
    saveData(data);
    res.status(201).json(newReply);
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor do Fórum rodando na porta ${PORT}`);
    console.log(`Banco de dados: ${DATA_FILE}`);
});