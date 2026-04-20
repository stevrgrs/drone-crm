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
      { customer_id: id, title, description },
    ])

    revalidatePath(`/customers/${id}`)
  }

  async function uploadImage(formData: FormData) {
    "use server"

    const supabase = await createClient()

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) return

    const bytes = new Uint8Array(await file.arrayBuffer())
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${id}/${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('customer-images')
      .upload(filePath, bytes, {
        contentType: file.type || 'application/octet-stream',
      })

    if (uploadError) return

    const { data } = supabase.storage
      .from('customer-images')
      .getPublicUrl(filePath)

    await supabase.from('customer_images').insert([
      { customer_id: id, image_url: data.publicUrl },
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

  const { data: images } = await supabase
    .from('customer_images')
    .select('*')
    .eq('customer_id', id)

  if (!customer) {
    return <main style={{ padding: 20 }}>Customer not found.</main>
  }

  return (
    <main style={{ padding: 20 }}>
      <Link href="/customers">← Back</Link>

      <h1>{customer.full_name}</h1>

      <p><strong>Phone:</strong> {customer.phone}</p>
      <p><strong>Email:</strong> {customer.email}</p>

      {/* FIXED HEADINGS */}
      <h2>Notes</h2>

      <form action={updateNotes}>
        <label htmlFor="notes">Customer Notes</label><br />
        <textarea
          id="notes"
          name="notes"
          defaultValue={customer.notes || ''}
          rows={4}
          style={{ width: '100%' }}
        />
        <br />
        <button type="submit">Save Notes</button>
      </form>

      <h2>Add Service Job</h2>

      <form action={addJob}>
        <label htmlFor="title">Job Title</label><br />
        <input id="title" name="title" required />

        <br />

        <label htmlFor="description">Description</label><br />
        <input id="description" name="description" />

        <br />
        <button type="submit">Add Job</button>
      </form>

      <h2>Service Jobs</h2>

      {jobs?.map((job: any) => (
        <div key={job.id}>
          <strong>{job.title}</strong><br />
          {job.description}
        </div>
      ))}

      <h2>Upload Image</h2>

      {uploadMessage && <p style={{ color: 'red' }}>{uploadMessage}</p>}

      <form action={uploadImage}>
        <label htmlFor="file">Choose Image</label><br />
        <input id="file" type="file" name="file" accept="image/*" required />
        <br />
        <button type="submit">Upload</button>
      </form>

      <h2>Images</h2>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {images?.map((img: any) => (
          <img
            key={img.id}
            src={img.image_url}
            alt="upload"
            style={{ width: 150 }}
          />
        ))}
      </div>
    </main>
  )
}