    const express = require('express');
    const cors = require('cors');
    require('dotenv').config();

    const app = express();
    app.use(cors());
    app.use(express.json());

    app.use('/api/auth',      require('./routes/auth.routes'));
    app.use('/api/quizzes',     require('./routes/exam.routes'));
    app.use('/api/questions', require('./routes/question.routes'));
    app.use('/api/attempts',  require('./routes/attempt.routes'));
    app.use('/api/scores',    require('./routes/score.routes'));
    app.use('/api/admin',     require('./routes/admin.routes'));

    app.get('/', (req, res) => res.send('Quiz Platform API running'));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
