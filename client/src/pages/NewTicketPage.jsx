import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { ticketSchema } from '../lib/validations/ticket'

const PRIORITIES = [
  { value: 'Low', className: 'priority-toggle low' },
  { value: 'Medium', className: 'priority-toggle medium' },
  { value: 'High', className: 'priority-toggle high' },
]

function getFieldClassName(fieldState, value) {
  if (fieldState.error) return 'input-invalid'
  if (fieldState.isDirty && value?.toString().trim()) return 'input-valid'
  return ''
}

function NewTicketPage() {
  const navigate = useNavigate()
  const descriptionRef = useRef(null)
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    getFieldState,
    formState,
  } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      customer_name: '',
      customer_email: '',
      subject: '',
      priority: 'Medium',
      description: '',
    },
    mode: 'onChange',
  })

  const { errors, isSubmitting } = formState

  const priority = watch('priority')
  const description = watch('description')
  const descriptionLength = description?.length ?? 0
  const descriptionMet = descriptionLength >= 20

  const autoResizeDescription = () => {
    const el = descriptionRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`
  }

  const onInvalid = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const onSubmit = async (data) => {
    try {
      const response = await api.post('/tickets', {
        customer_name: data.customer_name.trim(),
        customer_email: data.customer_email.trim(),
        subject: data.subject.trim(),
        description: data.description.trim(),
        priority: data.priority,
      })

      const ticketId = response.data.ticket_id
      setSuccess(true)

      setTimeout(() => {
        navigate(`/tickets/${ticketId}`)
      }, 1500)
    } catch (error) {
      const payload = error?.response?.data?.error
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        Object.entries(payload).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages[0]) {
            setError(field, { type: 'server', message: messages[0] })
          }
        })
      }
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  const nameState = getFieldState('customer_name', formState)
  const emailState = getFieldState('customer_email', formState)
  const subjectState = getFieldState('subject', formState)
  const descriptionState = getFieldState('description', formState)

  const descriptionRegister = register('description')

  return (
    <div className="create-ticket-page">
      <Link className="back-link" to="/tickets">
        <ArrowLeft size={16} />
        Back to Tickets
      </Link>

      <div className="crm-card create-ticket-card">
        <h2>Create New Ticket</h2>
        <p className="muted">Fill in the customer details and issue description.</p>
        {isSubmitting && <p className="form-submit-status">Submitting your ticket...</p>}

        <form
          className={`create-ticket-form${shake ? ' form-shake' : ''}${isSubmitting ? ' form-loading' : ''}`}
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          noValidate
        >
          <label>
            Customer Name <span className="required">*</span>
            <input
              type="text"
              placeholder="John Doe"
              className={getFieldClassName(nameState, watch('customer_name'))}
              {...register('customer_name')}
            />
            {errors.customer_name && (
              <span className="field-error">{errors.customer_name.message}</span>
            )}
          </label>

          <label>
            Customer Email <span className="required">*</span>
            <input
              type="email"
              placeholder="john@example.com"
              className={getFieldClassName(emailState, watch('customer_email'))}
              {...register('customer_email')}
            />
            {errors.customer_email && (
              <span className="field-error">{errors.customer_email.message}</span>
            )}
          </label>

          <label>
            Subject <span className="required">*</span>
            <input
              type="text"
              placeholder="Brief summary of the issue"
              className={getFieldClassName(subjectState, watch('subject'))}
              {...register('subject')}
            />
            {errors.subject && (
              <span className="field-error">{errors.subject.message}</span>
            )}
          </label>

          <fieldset className="priority-fieldset">
            <legend>
              Priority <span className="optional">(optional, default Medium)</span>
            </legend>
            <div className="priority-toggle-group">
              {PRIORITIES.map((item) => (
                <label
                  key={item.value}
                  className={`${item.className} ${priority === item.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={item.value}
                    checked={priority === item.value}
                    onChange={() => setValue('priority', item.value, { shouldValidate: true })}
                  />
                  {item.value}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="description-field">
            Description <span className="required">*</span>
            <div className="textarea-wrap">
              <textarea
                rows={4}
                placeholder="Describe the issue in detail..."
                className={getFieldClassName(descriptionState, description)}
                name={descriptionRegister.name}
                onBlur={descriptionRegister.onBlur}
                onChange={(e) => {
                  descriptionRegister.onChange(e)
                  requestAnimationFrame(autoResizeDescription)
                }}
                ref={(el) => {
                  descriptionRegister.ref(el)
                  descriptionRef.current = el
                }}
              />
              <span className={`char-count ${descriptionMet ? 'char-count-valid' : 'char-count-invalid'}`}>
                {descriptionLength} / 20 minimum
              </span>
            </div>
            {errors.description && (
              <span className="field-error">{errors.description.message}</span>
            )}
          </label>

          <button
            className={`btn-pill submit-full${success ? ' submit-success' : ''}`}
            type="submit"
            disabled={isSubmitting || success}
          >
            {success ? (
              <>
                <Check size={18} />
                Ticket Created!
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 size={18} className="spin" />
                Creating...
              </>
            ) : (
              'Create Ticket →'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default NewTicketPage
