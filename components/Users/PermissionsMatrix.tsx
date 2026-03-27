'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const PERMISSIONS = [
  { module: 'Dashboard', admin: 'Leitura', holder: 'Leitura', viewer: 'Leitura' },
  { module: 'Transacoes', admin: 'Leitura + Conciliar', holder: 'Leitura (proprio)', viewer: 'Leitura (todos)' },
  { module: 'Upload CSV', admin: 'Upload + Excluir', holder: '—', viewer: '—' },
  { module: 'Titulares', admin: 'CRUD + Notificar', holder: '—', viewer: '—' },
  { module: 'Recorrencias', admin: 'Detectar + Toggle', holder: '—', viewer: '—' },
  { module: 'Usuarios', admin: 'CRUD', holder: '—', viewer: '—' },
] as const

function PermissionCell({ value }: { value: string }) {
  if (value === '—') {
    return <span className="text-muted-foreground">Sem acesso</span>
  }
  return <span>{value}</span>
}

export function PermissionsMatrix() {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader className="cursor-pointer pb-3" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Matriz de Permissoes</CardTitle>
          <Button variant="ghost" size="sm">
            {expanded ? 'Recolher' : 'Expandir'}
          </Button>
        </div>
        {!expanded && (
          <p className="text-sm text-muted-foreground">
            Admin (acesso total) · Titular (proprio cartao) · Visualizador (leitura geral)
          </p>
        )}
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modulo</TableHead>
                  <TableHead>
                    <Badge variant="default">Admin</Badge>
                  </TableHead>
                  <TableHead>
                    <Badge variant="secondary">Titular</Badge>
                  </TableHead>
                  <TableHead>
                    <Badge variant="outline">Visualizador</Badge>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSIONS.map((p) => (
                  <TableRow key={p.module}>
                    <TableCell className="font-medium">{p.module}</TableCell>
                    <TableCell><PermissionCell value={p.admin} /></TableCell>
                    <TableCell><PermissionCell value={p.holder} /></TableCell>
                    <TableCell><PermissionCell value={p.viewer} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Altere o perfil de cada usuario na tabela abaixo. A mudanca tem efeito imediato.
          </p>
        </CardContent>
      )}
    </Card>
  )
}
