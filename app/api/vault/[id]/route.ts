import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const UpdateSchema = z.object({
    title: z.string().max(200).optional(),
    username: z.string().max(200).optional(),
    url: z.string().url().max(1000).optional(),
    password: z.string().min(1).max(500).optional(),
    notes: z.string().max(2000).optional(),
});

// PATCH /api/vault/:id
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
        const error = (parsed as z.SafeParseError<z.infer<typeof UpdateSchema>>).error;
        return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }


    const exists = await prisma.vaultItem.findFirst({
        where: { id: params.id, userId: session.user.id },
        select: { id: true },
    });
    if (!exists) return new NextResponse("Not found", { status: 404 });

    await prisma.vaultItem.update({
        where: { id: params.id },
        data: parsed.data,
    });

    return new NextResponse(null, { status: 204 });
}

// DELETE /api/vault/:id
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    await prisma.vaultItem.deleteMany({
        where: { id: params.id, userId: session.user.id },
    });

    return new NextResponse(null, { status: 204 });
}
