# Detailed Design Document (DDD)

## Movie Recommendation System with TensorFlow.js and Vector Database

**Version:** 1.0

## 1. Introduction

### Objective

Develop a movie recommendation platform based on the same architecture
used in the product recommendation project, extending it with semantic
embeddings stored in a vector database.

## 2. High-Level Architecture

``` text
Dataset (Kaggle)
        |
Preprocessing
        |
makeContext()
        |
+------------------------+
|                        |
encodeMovie()     encodeUser()
|                        |
+-----------+------------+
            |
createTrainingData()
            |
xs / ys
            |
TensorFlow.js
            |
model.fit()
            |
Trained Model
            |
encodeUser()
            |
concat(userVector, movieVector)
            |
model.predict()
            |
Ranking
            |
Recommendations
```

## 3. Technology Stack

### Frontend

-   React
-   Vite
-   TypeScript
-   Tailwind CSS

### Backend

-   FastAPI
-   SQLAlchemy
-   PostgreSQL

### AI

-   TensorFlow.js
-   Sentence Transformers

### Vector Database

-   Qdrant

## 4. Dataset

Source: https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset

Files: - movies_metadata.csv - credits.csv - keywords.csv -
ratings_small.csv - links.csv

## 5. Pipeline

1.  Load dataset
2.  Clean data
3.  Merge datasets
4.  Generate embeddings
5.  Store embeddings in Qdrant
6.  Build context
7.  Encode movies
8.  Encode users
9.  Build training dataset
10. Train TensorFlow.js model
11. Predict recommendations

## 6. Feature Engineering

### makeContext()

-   Normalize numeric features
-   Build lookup indexes
-   Compute global statistics

### encodeMovie()

-   Year
-   Rating
-   Popularity
-   Genres
-   Language
-   Director
-   Cast
-   Embedding

### encodeUser()

-   Average vectors from watched movies
-   Cold-start profile for new users

### createTrainingData()

-   Concatenate user and movie vectors
-   Build xs and ys

## 7. Neural Network

Input → Dense(128) → Dense(64) → Dense(32) → Dense(1 Sigmoid)

Loss: Binary Crossentropy Optimizer: Adam

## 8. REST API

-   POST /login
-   POST /register
-   GET /movies
-   GET /movies/{id}
-   GET /recommendations
-   GET /similar
-   POST /ratings
-   POST /favorites

## 9. Roadmap

-   Sprint 1: Infrastructure
-   Sprint 2: Database
-   Sprint 3: Embeddings
-   Sprint 4: Training
-   Sprint 5: Frontend
-   Sprint 6: Deployment

## 10. Future Improvements

-   Hybrid recommendation
-   Conversational AI
-   Incremental learning
-   Explainable recommendations
-   A/B testing
