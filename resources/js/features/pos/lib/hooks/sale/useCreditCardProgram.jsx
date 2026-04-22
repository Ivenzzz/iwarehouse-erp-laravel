import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { parseISO, isValid, isWithinInterval } from 'date-fns';

/**
 * Hook to determine if cart items are covered by an active credit card program
 * Returns program info and available loan terms if applicable
 */
export function useCreditCardProgram(cart) {
  // Fetch all active programs
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => base44.entities.Programs.filter({ is_active: true }),
    initialData: [],
  });

  // Fetch all product-program associations
  const { data: productWithPrograms = [] } = useQuery({
    queryKey: ['productWithPrograms'],
    queryFn: () => base44.entities.ProductwithPrograms.filter({ is_active: true }),
    initialData: [],
  });

  // Get variant IDs from the cart
  const cartVariantIds = useMemo(() => {
    return cart.map(item => item.variant_id).filter(Boolean);
  }, [cart]);

  // Find applicable credit card program for all cart variants
  const programData = useMemo(() => {
    if (cartVariantIds.length === 0) {
      return { hasProgram: false, program: null, loanTerms: [], message: 'No items in cart' };
    }

    const today = new Date();

    // Find programs that cover ALL cart variants with credit card payment
    const applicablePrograms = programs.filter(program => {
      // Check if program is active and within validity period
      if (!program.is_active) return false;

      const startDate = typeof program.start_date === 'string' 
        ? parseISO(program.start_date) 
        : new Date(program.start_date);
      const endDate = typeof program.end_date === 'string' 
        ? parseISO(program.end_date) 
        : new Date(program.end_date);

      if (!isValid(startDate) || !isValid(endDate)) return false;
      if (!isWithinInterval(today, { start: startDate, end: endDate })) return false;

      // Check if credit card is an allowed payment method
      const creditCardMethod = program.payment_methods_json?.methods?.find(
        m => m.type === 'card' && m.payment_type_name?.toLowerCase().includes('credit')
      );
      if (!creditCardMethod || !creditCardMethod.loan_terms?.length) return false;

      // Check if ALL cart variants are covered by this program
      const allVariantsCovered = cartVariantIds.every(variantId => {
        return productWithPrograms.some(
          pwp => pwp.program_id === program.id && pwp.variant_id === variantId && pwp.is_active
        );
      });

      return allVariantsCovered;
    });

    if (applicablePrograms.length === 0) {
      return { 
        hasProgram: false, 
        program: null, 
        loanTerms: [], 
        message: 'No active Credit Card program applies to the selected product(s)' 
      };
    }

    // Use the first applicable program (could enhance to pick best match)
    const selectedProgram = applicablePrograms[0];
    
    // Get credit card method with loan terms
    const creditCardMethod = selectedProgram.payment_methods_json?.methods?.find(
      m => m.type === 'card' && m.payment_type_name?.toLowerCase().includes('credit')
    );

    const loanTerms = creditCardMethod?.loan_terms || [];

    return {
      hasProgram: true,
      program: selectedProgram,
      loanTerms: loanTerms,
      creditCardMethodId: creditCardMethod?.payment_type_id,
      message: null,
    };
  }, [cartVariantIds, programs, productWithPrograms]);

  return programData;
}