import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  PhoneCall,
  CreditCard,
  MessageCircle,
  ThumbsUp,
  X,
  Send,
  Bell,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { useCreateCallWaiterMutation } from '@/store/api/fcmApi';

export enum CallWaiterType {
  Assistance = 'assistance',
  Emergency = 'emergency',
  BillRequest = 'bill_request',
  Complaint = 'complaint',
  Feedback = 'feedback',
}

export enum CallWaiterUrgency {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent',
}

interface CallWaiterButtonProps {
  tableId: string;
  restaurantId: string;
  orderId?: string;
  onCallSuccess?: (callId: string) => void;
}

interface CallOption {
  type: CallWaiterType;
  urgency: CallWaiterUrgency;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  textColor: string;
}

const callOptions: CallOption[] = [
  {
    type: CallWaiterType.Assistance,
    urgency: CallWaiterUrgency.Normal,
    title: 'Need Assistance',
    description: 'General help or questions',
    icon: <PhoneCall className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    textColor: '#1e40af',
  },
  {
    type: CallWaiterType.BillRequest,
    urgency: CallWaiterUrgency.Normal,
    title: 'Request Bill',
    description: 'Ready to pay the bill',
    icon: <CreditCard className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    textColor: '#047857',
  },
  {
    type: CallWaiterType.Emergency,
    urgency: CallWaiterUrgency.Urgent,
    title: 'Emergency',
    description: 'Urgent assistance needed',
    icon: <AlertTriangle className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    textColor: '#b91c1c',
  },
  {
    type: CallWaiterType.Complaint,
    urgency: CallWaiterUrgency.High,
    title: 'Complaint',
    description: 'Report an issue',
    icon: <MessageCircle className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    textColor: '#c2410c',
  },
  {
    type: CallWaiterType.Feedback,
    urgency: CallWaiterUrgency.Low,
    title: 'Feedback',
    description: 'Share your experience',
    icon: <ThumbsUp className="w-5 h-5" />,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    textColor: '#6d28d9',
  },
];

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .call-waiter-elegant {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .call-waiter-main-btn {
    width: 100%;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    font-weight: 700;
    padding: 16px 24px;
    border-radius: 14px;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .call-waiter-main-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.4);
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  }

  .call-waiter-main-btn:active {
    transform: translateY(0);
  }

  .call-waiter-dialog-title {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    text-align: center;
    margin-bottom: 20px;
  }

  .call-options-grid {
    display: grid;
    gap: 12px;
  }

  .call-option-card {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 14px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .call-option-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  }

  .call-option-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  .call-option-card:hover::before {
    opacity: 0.05;
  }

  .call-option-card:active {
    transform: translateY(0);
  }

  .call-option-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .call-option-content {
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    z-index: 1;
  }

  .call-option-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: white;
  }

  .call-option-text {
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  .call-option-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px 0;
  }

  .call-option-desc {
    font-size: 13px;
    color: #6b7280;
    margin: 0;
  }

  .call-selected-preview {
    background: white;
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 20px;
    border: 2px solid #e5e7eb;
  }

  .call-selected-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .call-selected-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }

  .call-selected-text h3 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px 0;
  }

  .call-selected-text p {
    font-size: 13px;
    color: #6b7280;
    margin: 0;
  }

  .call-message-section {
    margin-bottom: 20px;
  }

  .call-message-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }

  .call-message-textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    transition: border-color 0.2s;
  }

  .call-message-textarea:focus {
    outline: none;
    border-color: #0f172a;
  }

  .call-message-textarea::placeholder {
    color: #9ca3af;
  }

  .call-action-buttons {
    display: flex;
    gap: 12px;
  }

  .call-btn {
    flex: 1;
    padding: 14px 20px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 15px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
    transition: all 0.2s;
  }

  .call-btn.outline {
    background: white;
    border: 2px solid #e5e7eb;
    color: #374151;
  }

  .call-btn.outline:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .call-btn.primary {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
  }

  .call-btn.primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.3);
  }

  .call-btn.primary:active {
    transform: translateY(0);
  }

  .call-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

export const CallWaiterButton: React.FC<CallWaiterButtonProps> = ({
  tableId,
  restaurantId,
  orderId,
  onCallSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CallOption | null>(null);
  const [message, setMessage] = useState('');
  const [createCallWaiter, { isLoading }] = useCreateCallWaiterMutation();

  const handleCallWaiter = async (option: CallOption) => {
    if (
      option.type === CallWaiterType.Emergency ||
      option.type === CallWaiterType.BillRequest
    ) {
      await sendCallRequest(option);
    } else {
      setSelectedOption(option);
    }
  };

  const sendCallRequest = async (
    option: CallOption,
    additionalMessage?: string
  ) => {
    try {
      const requestBody = {
        restaurantId,
        tableId,
        type: option.type,
        urgency: option.urgency,
        message: additionalMessage || message || undefined,
        orderId: orderId || undefined,
      };

      const result = await createCallWaiter(requestBody).unwrap();

      toast.success('Waiter called successfully! 📞', {
        description: 'Our staff will be with you shortly.',
      });

      setIsOpen(false);
      setSelectedOption(null);
      setMessage('');

      if (onCallSuccess) {
        onCallSuccess(result.id);
      }
    } catch (error) {
      console.error('Failed to call waiter:', error);
      toast.error('Failed to call waiter', {
        description: 'Please try again or ask a nearby staff member.',
      });
    }
  };

  const handleSendWithDetails = async () => {
    if (selectedOption) {
      await sendCallRequest(selectedOption);
    }
  };

  const resetForm = () => {
    setSelectedOption(null);
    setMessage('');
  };

  return (
    <div className="call-waiter-elegant">
      <style>{STYLES}</style>

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <button
          onClick={() => setIsOpen(true)}
          className="call-waiter-main-btn"
        >
          <Bell className="w-5 h-5" />
          Call Waiter
        </button>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md mx-auto bg-white">
          <DialogHeader>
            <h2 className="call-waiter-dialog-title">
              {selectedOption ? selectedOption.title : 'How can we help you?'}
            </h2>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {!selectedOption ? (
              <motion.div
                key="options"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="call-options-grid"
              >
                {callOptions.map((option, index) => (
                  <motion.div
                    key={option.type}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      onClick={() => handleCallWaiter(option)}
                      disabled={isLoading}
                      className={`call-option-card ${
                        isLoading ? 'disabled' : ''
                      }`}
                      style={{
                        borderColor: option.textColor + '40',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: option.gradient,
                          opacity: 0.05,
                          pointerEvents: 'none',
                        }}
                      />
                      <div className="call-option-content">
                        <div
                          className="call-option-icon"
                          style={{ background: option.gradient }}
                        >
                          {option.icon}
                        </div>
                        <div className="call-option-text">
                          <h3
                            className="call-option-title"
                            style={{ color: option.textColor }}
                          >
                            {option.title}
                          </h3>
                          <p className="call-option-desc">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="call-selected-preview">
                  <div className="call-selected-content">
                    <div
                      className="call-selected-icon"
                      style={{ background: selectedOption.gradient }}
                    >
                      {selectedOption.icon}
                    </div>
                    <div className="call-selected-text">
                      <h3 style={{ color: selectedOption.textColor }}>
                        {selectedOption.title}
                      </h3>
                      <p>{selectedOption.description}</p>
                    </div>
                  </div>
                </div>

                <div className="call-message-section">
                  <label htmlFor="message" className="call-message-label">
                    Message (Optional)
                  </label>
                  <textarea
                    id="message"
                    placeholder="Describe what you need help with..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="call-message-textarea"
                  />
                </div>

                <div className="call-action-buttons">
                  <button onClick={resetForm} className="call-btn outline">
                    <X className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleSendWithDetails}
                    disabled={isLoading}
                    className="call-btn primary"
                  >
                    <Send className="w-4 h-4" />
                    {isLoading ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
};
