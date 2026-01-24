import React, { useState } from 'react';
import { Box, Container, Card, CardContent } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import AuthLogo from '../../components/auth/AuthLogo';
import AuthEmailCheck from '../../components/auth/AuthEmailCheck';
import AuthSignupForm from '../../components/auth/AuthSignupForm';
import AuthPriceBilling from '../../components/auth/AuthPriceBilling';
import stripeService from '../../services/stripeService';

/**
 * ParentSignup Page
 *
 * 3-step flow:
 * 1) Email check (UX-only, backend still validates uniqueness)
 * 2) Account details (name + password) and create Stripe Checkout Session
 * 3) Billing summary screen, then redirect to Stripe Checkout
 */
const ParentSignup = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStep = (() => {
    const value = Number(searchParams.get('step'));
    if (value === 2 || value === 3) return value;
    return 1;
  })();

  const [step, setStep] = useState(initialStep);
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    name: searchParams.get('name') || '',
    password: '',
    sessionId: searchParams.get('sessionId') || '',
    checkoutUrl: searchParams.get('checkoutUrl') || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateSearchParams = (nextStep, nextState = {}) => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(nextStep));

    if (nextState.email !== undefined) {
      params.set('email', nextState.email);
    }

    if (nextState.name !== undefined) {
      params.set('name', nextState.name);
    }

    if (nextState.sessionId !== undefined) {
      params.set('sessionId', nextState.sessionId);
    }

    if (nextState.checkoutUrl !== undefined) {
      params.set('checkoutUrl', nextState.checkoutUrl);
    }

    setSearchParams(params);
  };

  const handleEmailNext = (email) => {
    setError('');
    setFormData((prev) => ({ ...prev, email }));
    setStep(2);
    updateSearchParams(2, { email });
  };

  const handleSignupNext = async ({ name, password }) => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        name,
        email: formData.email,
        password,
      };

      const data = await stripeService.createParentSignupSession(payload);

      setFormData((prev) => ({
        ...prev,
        name,
        password, // not persisted anywhere else; only in memory during this flow
        sessionId: data.sessionId,
        checkoutUrl: data.url,
      }));

      setStep(3);
      updateSearchParams(3, {
        email: formData.email,
        name,
        sessionId: data.sessionId,
        checkoutUrl: data.url,
      });
    } catch (err) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        'Unable to start billing session. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToCheckout = async () => {
    setError('');
    setLoading(true);
    try {
      if (!formData.checkoutUrl) {
        throw new Error('Missing Stripe checkout URL. Please go back and try again.');
      }

      window.location.href = formData.checkoutUrl;
    } catch (err) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        'Unable to redirect to Stripe. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <AuthEmailCheck
          initialEmail={formData.email}
          onNext={handleEmailNext}
          loading={loading}
          error={error}
        />
      );
    }

    if (step === 2) {
      return (
        <AuthSignupForm
          email={formData.email}
          initialName={formData.name}
          onBack={() => setStep(1)}
          onNext={handleSignupNext}
          loading={loading}
          error={error}
        />
      );
    }

    return (
      <AuthPriceBilling
        email={formData.email}
        name={formData.name}
        onBack={() => setStep(2)}
        onContinue={handleGoToCheckout}
        loading={loading}
        error={error}
      />
    );
  };

  return (
    <Box className="auth-login-page" role="main" aria-label="Parent signup page">
      <Container maxWidth="sm" className="auth-signup-container">
        <AuthLogo />

        <Card
          className="auth-login-card"
          sx={{
            mt: 3,
            overflow: 'hidden',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4
            }
          }}
        >
        <CardContent
          className="auth-login-card-content"
          sx={{ m: 0 }}
          role="form"
          aria-label="Parent signup steps"
        >
          {renderStep()}
        </CardContent>
      </Card>
    </Container>
    </Box >
  );
};

export default ParentSignup;
