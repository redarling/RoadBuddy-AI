import { err, ok, Result } from 'neverthrow';
import { db } from '../index';
import { usersTable } from './schema';
import { City, ConversationState, Countries, resultTelegramMessage } from '../types/types';
import { eq } from 'drizzle-orm';
import { sendTelegramMessage } from '../telegram_interactions/interactions';
import { message_templates } from '../types/message_templates';

export interface User {
  chat_id: number;
  conversationState: ConversationState;
  wrong_answer_count: number;
  correct_answer_count: number;
  current_correct_answer_id: string;
  city:  City | null;
  country:  Countries | null;
  explanation: string | null;
}

async function rowToUser(row: any): Promise<User> {
  return {
    chat_id: row.chat_id,
    conversationState: row.conversationState,
    wrong_answer_count: row.wrong_answer_count,
    correct_answer_count: row.correct_answer_count,
    current_correct_answer_id: row.current_correct_answer_id,
    city: row.city,
    country: row.country,
    explanation: row.explanation,
  };
}

export async function getOrCreateUser(chat_id: number): Promise<Result<User, Error>> {
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.chat_id, chat_id))
      .limit(1)

    if (existingUser.length > 0) {
      return ok(await rowToUser(existingUser[0]));
    }

    const [newUser] = await db
      .insert(usersTable)
      .values({
        chat_id: chat_id,
        conversationState: ConversationState.MAIN_MENU,
        wrong_answer_count: 0,
        correct_answer_count:  0,
        current_correct_answer_id: '',
      })
      .returning();

    return ok(await rowToUser(newUser));
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
}

export async function setUserToFlow(user: User): Promise<Result<boolean, Error>> {
  try {
    const updatedUser = await db
      .update(usersTable)
      .set({
        conversationState: ConversationState.FLOW,
      })
      .where(eq(usersTable.chat_id, user.chat_id))

    return ok(true);
  } catch (error) {
    console.error('Error setting user to FLOW state:', error);
    return err(new Error('Failed to set user to FLOW state'));
  }
}

export async function setUserToMainMenu(user: User): Promise<Result<boolean, Error>> {
  try {
    await db
      .update(usersTable)
      .set({
        conversationState: ConversationState.MAIN_MENU,
        wrong_answer_count: 0,
        correct_answer_count: 0,
        current_correct_answer_id: '',
        city: null,
        country: null,
      })
      .where(eq(usersTable.chat_id, user.chat_id));

    return ok(true);
  } catch (error) {
    console.error('Error setting user to MAIN_MENU state:', error);
    return err(new Error('Failed to set user to MAIN_MENU state'));
  }
}

export async function updateUser(
  user: User,
  city: City | null,
  country: Countries | null,
  explanation: string | null,
): Promise<Result<User, Error>> {
  try {
    const updateData: Record<string, any> = {};
    if (city !== null) {
      updateData.city = city;
    }

    if (country !== null) {
      updateData.country = country;
    }

    if (explanation !== null) {
      updateData.explanation = explanation;
    }

    if (Object.keys(updateData).length > 0) {
      const updatedUser = await db
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.chat_id, user.chat_id))
        .returning();
      if (updatedUser.length === 0) {
        return err(new Error('User not found'));
      }
      return ok(await rowToUser(updatedUser[0]));
    }
    return (ok(user));
  } catch (error) {
    console.error('Error updating user:', error);
    return err(new Error('Failed to update user'));
  }
}

export async function updateUserCorrectAnswerCount(chat_id: number, correct_answer_count: number): Promise<Result<void, Error>> {
  try {
    await db
      .update(usersTable)
      .set({
        correct_answer_count: correct_answer_count,
      })
      .where(eq(usersTable.chat_id, chat_id))
      .returning();
    return ok(undefined);
  } catch (error) {
    console.error('Error updating user correct answer count:', error);
    return err(new Error('Failed to update user correct answer count'));
  }
}

export async function updateUserWrongAnswerCount(chat_id: number, wrong_answer_count: number): Promise<Result<void, Error>> {
  try {
    await db
      .update(usersTable)
      .set({
        wrong_answer_count: wrong_answer_count,
      })
      .where(eq(usersTable.chat_id, chat_id))
      .returning();
    return ok(undefined);
  } catch (error) {
    console.error('Error updating user wrong answer count:', error);
    return err(new Error('Failed to update user wrong answer count'));
  }
}

export async function updateUserCurrentCorrectAnswerId(chat_id: number, current_correct_answer_id: string): Promise<Result<void, Error>> {
  try {
    await db
      .update(usersTable)
      .set({
        current_correct_answer_id: current_correct_answer_id,
      })
      .where(eq(usersTable.chat_id, chat_id))
      .returning();
    return ok(undefined);
  } catch (error) {
    console.error('Error updating user current correct answer id:', error);
    return err(new Error('Failed to update user current correct answer id'));
  }
}