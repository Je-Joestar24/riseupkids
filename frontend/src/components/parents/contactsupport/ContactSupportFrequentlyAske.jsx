import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * ContactSupportFrequentlyAsked Component
 * 
 * Displays frequently asked questions in cards
 */
const ContactSupportFrequentlyAsked = () => {
  const faqs = [
    {
      question: "How do I track my child's progress?",
      answer: "Go to the Parent menu and select \"View Child Progress\" to see detailed analytics, learning time, and achievements.",
    },
    {
      question: "How do live lessons work?",
      answer: "Live lessons are scheduled interactive classes with certified teachers. You'll see upcoming sessions on the Home page.",
    },
    {
      question: "How do I cancel my subscription?",
      answer: "Go to Account Settings → Subscription. You can cancel anytime, and access continues until the billing period ends.",
    },
    {
      question: "Is my child's data secure?",
      answer: "Absolutely. We comply with COPPA and GDPR regulations and never share personal information with third parties.",
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.25rem', sm: '1.25rem' },
          fontWeight: 700,
          color: themeColors.secondary,
          paddingX: { xs: 1, sm: 1 },
        }}
      >
        Frequently Asked Questions
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {faqs.map((faq, index) => (
          <Card
            key={index}
            sx={{
              borderRadius: { xs: '20px', sm: '24px' },
              backgroundColor: themeColors.bgCard,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <CardContent sx={{ padding: { xs: 3, sm: 3.75 } }}>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                  fontWeight: 600,
                  color: themeColors.secondary,
                  marginBottom: 1,
                }}
              >
                {faq.question}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  fontWeight: 400,
                  color: themeColors.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                {faq.answer}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default ContactSupportFrequentlyAsked;
