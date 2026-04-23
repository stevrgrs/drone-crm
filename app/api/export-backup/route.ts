import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: customers } = await supabase.from('customers').select('*')
  const { data: jobs } = await supabase.from('service_jobs').select('*')
  const { data: images } = await supabase.from('job_images').select('*')

  const workbook = new ExcelJS.Workbook()

  const customerSheet = workbook.addWorksheet('Customers')
  customerSheet.columns = Object.keys(customers?.[0] || {}).map(k => ({ header: k, key: k }))
  customers?.forEach(c => customerSheet.addRow(c))

  const jobSheet = workbook.addWorksheet('Repairs')
  jobSheet.columns = Object.keys(jobs?.[0] || {}).map(k => ({ header: k, key: k }))
  jobs?.forEach(j => jobSheet.addRow(j))

  const imageSheet = workbook.addWorksheet('Photos')
  imageSheet.columns = Object.keys(images?.[0] || {}).map(k => ({ header: k, key: k }))
  images?.forEach(i => imageSheet.addRow(i))

  const metaSheet = workbook.addWorksheet('Meta')
  metaSheet.addRow(['Exported At', new Date().toISOString()])
  metaSheet.addRow(['Customers', customers?.length || 0])
  metaSheet.addRow(['Repairs', jobs?.length || 0])
  metaSheet.addRow(['Photos', images?.length || 0])

  const buffer = await workbook.xlsx.writeBuffer()

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=backup-${timestamp}.xlsx`,
    },
  })
}
