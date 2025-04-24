#!/usr/bin/env node

import { execSync } from 'child_process';
import inquirer from 'inquirer';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function getGitDiff() {
  try {
    return execSync('git diff --staged', { encoding: 'utf8' });
  } catch (error) {
    console.error('Error getting git diff:', error);
    process.exit(1);
  }
}

async function generateCommitMessage(diff) {
  const prompt = `You are an experienced software engineer. Based on the following git diff, generate a clear and concise Conventional Commit message:\n\n${diff}\n\nCommit message:`;

  try {
    const res = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return res.data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Error generating message from Gemini:', error.response?.data || error);
    process.exit(1);
  }
}

async function run() {
  const diff = getGitDiff();
  if (!diff) {
    console.log('No staged changes found. Please git add first.');
    return;
  }

  const message = await generateCommitMessage(diff);

  const { confirmCommit } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmCommit',
      message: `Suggested commit message:\n\n${message}\n\nDo you want to use this message?`,
      default: true,
    },
  ]);

  if (confirmCommit) {
    try {
      execSync(`git commit -m "${message.replace(/"/g, '\"')}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error('Failed to commit:', err);
    }
  } else {
    console.log('Commit cancelled.');
  }
}

run();