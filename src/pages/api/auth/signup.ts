import type { NextApiRequest, NextApiResponse } from "next"
import bcrypt from "bcryptjs"

import { db } from "@/server/db"
import { createPermissions, PermissionBit } from "@/utils/permissions"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "METHOD_NOT_ALLOWED" })
  }

  try {
    const { name, password } = req.body

    if (
      !name ||
      !password ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Пароль должен содержать не менее 8 символов.",
      })
    }

    const existingUser = await db.user.findFirst({
      where: { name: name as string },
    })

    if (existingUser) {
      return res
        .status(422)
        .json({ message: "Аккаунт с таким логином уже существует." })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await db.user.create({
      data: {
        name: name as string,
        displayName: name as string,
        password: hashedPassword,
        permissions: createPermissions([PermissionBit.TUTOR]),
      },
    })

    res.status(201).json({ message: "Аккаунт успешно создан." })
  } catch (error) {
    res.status(500).json({ message: "Не удалось создать аккаунт.", error })
  }
}
