import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import UploadImage from './UploadImage'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  async function updateNotes(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const notes = String(formData.get('notes') ?? '')

    await supabase
      .from('customers')
      .update({ notes })
      .eq('id', id)

    revalidatePath(`/customers/${id}`)
  }

  async function addJob(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const title = String(formData.get('title') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()

    if (!title) return

    await supabase.from('service_jobs').insert([
      {
        customer_id: id,
        title,
        description,
      },
    ])

    revalidatePath(`/customers/${id}`)
  }

  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  const { data: jobs } = await supabase
    .from('service_jobs')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  const { data: images } = await supabase
    .from('customer_images')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  if (!customer) {
    return <main style={{ padding: 20 }}>Customer not found.</main>
  }

  return (
    <main style={{ padding: 20 }}>
      <Link href="/customers">← Back to Customers</Link>

      <h1 style={{ marginTop: 20 }}>{customer.full_name}</h1>

      <p><strong>Phone:</strong> {customer.phone}</p>
      <p><strong>Email:</strong> {customer.email}</p>

      <h2>Notes</h2>

      <form action={updateNotes}>
        <label htmlFor="notes">Customer Notes</label>
        <br />
        <textarea
          id="notes"
          name="notes"
          defaultValue={customer.notes || ''}
          rows={4}
          style={{ width: '100%' }}
        />
        <br />
        <button type="submit" style={{ marginTop: 10 }}>
          Save Notes
        </button>
      </form>

      <h2 style={{ marginTop: 30 }}>Add Service Job</h2>

      <form action={addJob} style={{ marginBottom: 20 }}>
        <label htmlFor="title">Job Title</label>
        <br />
        <input id="title" name="title" required />

        <br />
        <label htmlFor="description" style={{ display: 'inline-block', marginTop: 8 }}>
          Description
        </label>
        <br />
        <input id="description" name="description" style={{ width: 300 }} />

        <br />
        <button type="submit" style={{ marginTop: 8 }}>
          Add Job
        </button>
      </form>

      <h2>Service Jobs</h2>

      {jobs?.length ? (
        jobs.map((job: any) => (
          <div
            key={job.id}
            style={{
              border: '1px solid #ccc',
              padding: 12,
              marginBottom: 10,
            }}
          >
            <strong>
              <Link href={`/jobs/${job.id}`}>{job.title}</Link>
            </strong>
            <br />
            {job.description}
            <br />
            Status: {job.status}
          </div>
        ))
      ) : (
        <p>No jobs yet.</p>
      )}

      <h2 style={{ marginTop: 30 }}>Upload Image</h2>
      <UploadImage customerId={id} />

      <h2 style={{ marginTop: 30 }}>Images</h2>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {images?.map((img: any) => (
          <img
            key={img.id}
            src={img.image_url}
            alt="Customer upload"
            style={{
              width: 150,
              height: 150,
              objectFit: 'cover',
              border: '1px solid #ccc',
            }}
          />
        ))}
      </div>
    </main>
  )
}