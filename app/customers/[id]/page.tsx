import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error: uploadMessage } = await searchParams

  async function updateNotes(formData: FormData) {
    "use server"

    const supabase = await createClient()
    const notes = String(formData.get('notes') ?? '')

    await supabase
      .from('customers')
      .update({ notes })
      .eq('id', id)

    revalidatePath(`/customers/${id}`)
  }

  async function addJob(formData: FormData) {
    "use server"

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

  async function uploadImage(formData: FormData) {
    "use server"

    const supabase = await createClient()

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      throw new Error('No file was selected.')
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${id}/${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('customer-images')
      .upload(filePath, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: publicUrlData } = supabase.storage
      .from('customer-images')
      .getPublicUrl(filePath)

    const { error: insertError } = await supabase
      .from('customer_images')
      .insert([
        {
          customer_id: id,
          image_url: publicUrlData.publicUrl,
        },
      ])

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`)
    }

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

      <h3>Notes</h3>

      <form action={updateNotes}>
        <textarea
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

      <h3 style={{ marginTop: 30 }}>Add Service Job</h3>

      <form action={addJob} style={{ marginBottom: 20 }}>
        <input name="title" placeholder="Job title" required />
        <input
          name="description"
          placeholder="Description"
          style={{ marginLeft: 8, width: 300 }}
        />
        <button type="submit" style={{ marginLeft: 8 }}>
          Add Job
        </button>
      </form>

      <h3>Service Jobs</h3>

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
            <strong>{job.title}</strong><br />
            {job.description}<br />
            Status: {job.status}
          </div>
        ))
      ) : (
        <p>No jobs yet.</p>
      )}

      <h3 style={{ marginTop: 30 }}>Upload Image</h3>

      {uploadMessage ? (
        <pre style={{ color: 'tomato' }}>{uploadMessage}</pre>
      ) : null}

      <form action={uploadImage}>
        <input type="file" name="file" accept="image/*" required />
        <button type="submit" style={{ marginLeft: 8 }}>
          Upload
        </button>
      </form>

      <h3 style={{ marginTop: 30 }}>Images</h3>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {images?.map((img: any) => (
          <img
            key={img.id}
            src={img.image_url}
            alt="Customer upload"
            style={{ width: 150, height: 150, objectFit: 'cover', border: '1px solid #ccc' }}
          />
        ))}
      </div>
    </main>
  )
}