import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  PhoneCall,
  CreditCard,
  MessageCircle,
  ThumbsUp,
  X,
  Send,
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
  color: string;
  bgColor: string;
}

const callOptions: CallOption[] = [
  {
    type: CallWaiterType.Assistance,
    urgency: CallWaiterUrgency.Normal,
    title: 'Need Assistance',
    description: 'General help or questions',
    icon: <PhoneCall className="w-6 h-6" />,
    color: '',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  {
    type: CallWaiterType.BillRequest,
    urgency: CallWaiterUrgency.Normal,
    title: 'Request Bill',
    description: 'Ready to pay the bill',
    icon: <CreditCard className="w-6 h-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
  {
    type: CallWaiterType.Emergency,
    urgency: CallWaiterUrgency.Urgent,
    title: 'Emergency',
    description: 'Urgent assistance needed',
    icon: <AlertTriangle className="w-6 h-6" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
  },
  {
    type: CallWaiterType.Complaint,
    urgency: CallWaiterUrgency.High,
    title: 'Complaint',
    description: 'Report an issue or concern',
    icon: <MessageCircle className="w-6 h-6" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
  },
  {
    type: CallWaiterType.Feedback,
    urgency: CallWaiterUrgency.Low,
    title: 'Feedback',
    description: 'Share your experience',
    icon: <ThumbsUp className="w-6 h-6" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
];

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
      // For emergency and bill request, send immediately without additional details
      await sendCallRequest(option);
    } else {
      // For other types, show form for additional details
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
    <>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          onClick={() => setIsOpen(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg"
          size="lg"
        >
          <PhoneCall className="w-5 h-5 mr-2" />
          Call Waiter
        </Button>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              {selectedOption ? selectedOption.title : 'How can we help you?'}
            </DialogTitle>
          </DialogHeader>

          {!selectedOption ? (
            <div className="space-y-3">
              {callOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => handleCallWaiter(option)}
                  disabled={isLoading}
                  className={`w-full p-4 rounded-lg border-2 border-transparent transition-all duration-200 ${option.bgColor} ${option.color} hover:border-current disabled:opacity-50`}
                >
                  <div className="flex items-center space-x-3">
                    {option.icon}
                    <div className="text-left flex-1">
                      <h3 className="font-semibold">{option.title}</h3>
                      <p className="text-sm opacity-75">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg ${selectedOption.bgColor} ${selectedOption.color}`}
              >
                <div className="flex items-center space-x-3">
                  {selectedOption.icon}
                  <div>
                    <h3 className="font-semibold">{selectedOption.title}</h3>
                    <p className="text-sm opacity-75">
                      {selectedOption.description}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Describe what you need help with..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSendWithDetails}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isLoading ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
