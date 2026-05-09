import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack)
  res.status(500).json({ success: false, error: 'Internal server error' })
}
