import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name, householdId, userId } = body;

    // LOGIN
    if (action === 'login') {
      if (!email || !password) return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
      const user = await db.user.findFirst({
        where: { email },
        include: { household: { select: { id: true, name: true } } },
      });
      if (!user) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      if (!user.isActive) return NextResponse.json({ error: 'Tu cuenta fue desactivada. Contactá al administrador.' }, { status: 403 });
      return NextResponse.json({
        id: user.id, email: user.email, name: user.name,
        role: user.role, householdId: user.householdId,
        householdName: user.household.name,
      });
    }

    // REGISTER — first user creates a household, or join existing
    if (action === 'register') {
      if (!email || !password || !name) return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
      if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

      if (householdId) {
        // Join existing household
        const household = await db.household.findUnique({ where: { id: householdId } });
        if (!household) return NextResponse.json({ error: 'Hogar no encontrado' }, { status: 404 });
        const existing = await db.user.findFirst({ where: { email, householdId } });
        if (existing) return NextResponse.json({ error: 'Este email ya está registrado en este hogar' }, { status: 400 });
        const hashed = await bcrypt.hash(password, 10);
        const user = await db.user.create({
          data: { email, password: hashed, name, role: 'member', householdId },
        });
        // Seed default accounts for the new member's view
        const existingAccounts = await db.account.findMany({ where: { householdId } });
        if (existingAccounts.length === 0) {
          await db.account.createMany({
            data: [
              { name: 'Efectivo (ARS)', currency: 'ARS', balance: 0, icon: 'Banknote', color: '#22c55e', householdId },
              { name: 'Cuenta Bancaria (ARS)', currency: 'ARS', balance: 0, icon: 'Landmark', color: '#3b82f6', householdId },
              { name: 'Efectivo (USD)', currency: 'USD', balance: 0, icon: 'DollarSign', color: '#10b981', householdId },
              { name: 'Cuenta Bancaria (USD)', currency: 'USD', balance: 0, icon: 'PiggyBank', color: '#8b5cf6', householdId },
            ],
          });
        }
        return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role, householdId, householdName: household.name });
      }

      // Create new household
      const existingGlobal = await db.user.findFirst({ where: { email } });
      if (existingGlobal) return NextResponse.json({ error: 'Este email ya está registrado en otro hogar' }, { status: 400 });
      const hashed = await bcrypt.hash(password, 10);
      const household = await db.household.create({
        data: {
          name: `Hogar de ${name}`,
          users: { create: { email, password: hashed, name, role: 'admin' } },
          accounts: { create: [
            { name: 'Efectivo (ARS)', currency: 'ARS', balance: 0, icon: 'Banknote', color: '#22c55e' },
            { name: 'Cuenta Bancaria (ARS)', currency: 'ARS', balance: 0, icon: 'Landmark', color: '#3b82f6' },
            { name: 'Efectivo (USD)', currency: 'USD', balance: 0, icon: 'DollarSign', color: '#10b981' },
            { name: 'Cuenta Bancaria (USD)', currency: 'USD', balance: 0, icon: 'PiggyBank', color: '#8b5cf6' },
          ]},
        },
        include: { users: true },
      });
      const user = household.users[0];
      return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role, householdId: household.id, householdName: household.name });
    }

    // FORGOT PASSWORD — returns admin email so user can contact them
    if (action === 'forgot') {
      if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
      const user = await db.user.findFirst({
        where: { email },
        include: { household: { select: { id: true, name: true } } },
      });
      if (!user) return NextResponse.json({ error: 'Email no registrado' }, { status: 404 });
      const admins = await db.user.findMany({ where: { householdId: user.householdId, role: 'admin', isActive: true } });
      return NextResponse.json({
        message: 'Contactá al administrador de tu hogar para restablecer tu contraseña.',
        admins: admins.map(a => ({ name: a.name, email: a.email })),
        householdName: user.household.name,
      });
    }

    // CHANGE PASSWORD (current user)
    if (action === 'changePassword') {
      if (!userId || !password) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
      if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      const hashed = await bcrypt.hash(password, 10);
      await db.user.update({ where: { id: userId }, data: { password: hashed } });
      return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente' });
    }

    // ADMIN RESETS USER PASSWORD
    if (action === 'adminResetPassword') {
      if (!userId || !password) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
      if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      const hashed = await bcrypt.hash(password, 10);
      await db.user.update({ where: { id: userId }, data: { password: hashed } });
      return NextResponse.json({ success: true, message: 'Contraseña restablecida' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
