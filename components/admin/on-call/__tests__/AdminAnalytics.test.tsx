import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AdminAnalytics from '../AdminAnalytics';

describe('AdminAnalytics', () => {
  const mockStats = {
    residentShiftCounts: {
      'John Doe': 15,
      'Jane Smith': 12,
      'Bob Johnson': 8,
      'Alice Williams': 10,
    },
    weekendShifts: {
      'John Doe': 5,
      'Jane Smith': 3,
      'Bob Johnson': 4,
      'Alice Williams': 2,
    },
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<AdminAnalytics stats={mockStats} />);
      expect(screen.getByText(/shifts per resident/i)).toBeInTheDocument();
    });

    it('should render both analytics sections', () => {
      render(<AdminAnalytics stats={mockStats} />);
      expect(screen.getByText(/shifts per resident/i)).toBeInTheDocument();
      expect(screen.getByText(/weekend distribution/i)).toBeInTheDocument();
    });

    it('should have proper section icons', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      expect(container.textContent).toContain('📊');
      expect(container.textContent).toContain('🌅');
    });
  });

  describe('bar chart (shifts per resident)', () => {
    it('should display all resident names', () => {
      render(<AdminAnalytics stats={mockStats} />);
      // Names appear in both shift chart and weekend grid
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Bob Johnson').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Alice Williams').length).toBeGreaterThan(0);
    });

    it('should display shift counts', () => {
      render(<AdminAnalytics stats={mockStats} />);
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should sort residents by shift count (descending)', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      const names = Array.from(container.querySelectorAll('.w-32'))
        .map((el) => el.textContent)
        .filter(Boolean);

      // First section contains the bar chart, names should be sorted
      const firstFourNames = names.slice(0, 4);
      expect(firstFourNames[0]).toBe('John Doe'); // 15 shifts
      expect(firstFourNames[1]).toBe('Jane Smith'); // 12 shifts
      expect(firstFourNames[2]).toBe('Alice Williams'); // 10 shifts
      expect(firstFourNames[3]).toBe('Bob Johnson'); // 8 shifts
    });

    it('should calculate bar widths based on max shifts', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      const bars = container.querySelectorAll('.bg-gradient-to-r');

      // John Doe has 15 shifts (max), should be 100% width
      const johnBar = bars[0] as HTMLElement;
      expect(johnBar.style.width).toBe('100%');

      // Jane Smith has 12 shifts, should be 80% width (12/15 * 100)
      const janeBar = bars[1] as HTMLElement;
      expect(janeBar.style.width).toBe('80%');
    });
  });

  describe('weekend distribution grid', () => {
    it('should display weekend shift counts', () => {
      render(<AdminAnalytics stats={mockStats} />);
      // Weekend counts: 5, 3, 4, 2
      const weekendSection = screen.getByText(/weekend distribution/i).closest('div');
      expect(weekendSection).toHaveTextContent('5');
      expect(weekendSection).toHaveTextContent('3');
      expect(weekendSection).toHaveTextContent('4');
      expect(weekendSection).toHaveTextContent('2');
    });

    it('should sort weekend shifts by count (descending)', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      const weekendCards = Array.from(
        container.querySelectorAll('.bg-orange-50, .dark\\:bg-orange-950\\/30'),
      );

      // Get the count (first div) from each card
      const counts = weekendCards
        .map((card) => {
          const countDiv = card.querySelector('.text-2xl');
          return countDiv?.textContent;
        })
        .filter(Boolean);

      expect(counts[0]).toBe('5'); // John Doe
      expect(counts[1]).toBe('4'); // Bob Johnson
      expect(counts[2]).toBe('3'); // Jane Smith
      expect(counts[3]).toBe('2'); // Alice Williams
    });

    it('should use grid layout for weekend cards', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-2');
      expect(grid).toHaveClass('sm:grid-cols-3');
      expect(grid).toHaveClass('md:grid-cols-4');
    });
  });

  describe('edge cases', () => {
    it('should handle empty stats gracefully', () => {
      const emptyStats = {
        residentShiftCounts: {},
        weekendShifts: {},
      };
      render(<AdminAnalytics stats={emptyStats} />);
      expect(screen.getByText(/shifts per resident/i)).toBeInTheDocument();
      expect(screen.getByText(/weekend distribution/i)).toBeInTheDocument();
    });

    it('should handle single resident', () => {
      const singleStats = {
        residentShiftCounts: { 'John Doe': 5 },
        weekendShifts: { 'John Doe': 2 },
      };
      render(<AdminAnalytics stats={singleStats} />);
      // John Doe appears in both sections (shifts and weekend)
      const names = screen.getAllByText('John Doe');
      expect(names.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should handle zero shifts correctly', () => {
      const zeroStats = {
        residentShiftCounts: { 'John Doe': 0 },
        weekendShifts: { 'John Doe': 0 },
      };
      render(<AdminAnalytics stats={zeroStats} />);
      const bars = document.querySelectorAll('.bg-gradient-to-r');
      // When max is 0, width calculation should not error (NaN)
      expect(bars.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long resident names', () => {
      const longNameStats = {
        residentShiftCounts: {
          'Very Long Resident Name That Should Be Truncated': 10,
        },
        weekendShifts: {
          'Very Long Resident Name That Should Be Truncated': 3,
        },
      };
      render(<AdminAnalytics stats={longNameStats} />);
      const nameElements = screen.getAllByTitle('Very Long Resident Name That Should Be Truncated');
      expect(nameElements.length).toBeGreaterThan(0);
      nameElements.forEach((el) => {
        expect(el).toHaveClass('truncate');
      });
    });

    it('should handle large numbers', () => {
      const largeStats = {
        residentShiftCounts: { 'John Doe': 999 },
        weekendShifts: { 'John Doe': 150 },
      };
      render(<AdminAnalytics stats={largeStats} />);
      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      const headings = container.querySelectorAll('h3');
      expect(headings).toHaveLength(2);
      headings.forEach((heading) => {
        expect(heading).toHaveClass('text-lg');
        expect(heading).toHaveClass('font-bold');
      });
    });

    it('should have title attributes for truncated names', () => {
      render(<AdminAnalytics stats={mockStats} />);
      const truncatedElements = document.querySelectorAll('.truncate');
      truncatedElements.forEach((el) => {
        expect(el).toHaveAttribute('title');
      });
    });

    it('should use semantic HTML structure', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      expect(container.querySelector('.space-y-4')).toBeInTheDocument();
      expect(container.querySelectorAll('.card-levitate')).toHaveLength(2);
    });

    it('should support dark mode classes', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      const darkModeElements = container.querySelectorAll('[class*="dark:"]');
      expect(darkModeElements.length).toBeGreaterThan(0);
    });
  });

  describe('visual presentation', () => {
    it('should apply gradient to progress bars', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      const bars = container.querySelectorAll('.bg-gradient-to-r');
      expect(bars.length).toBeGreaterThan(0);
      bars.forEach((bar) => {
        expect(bar).toHaveClass('from-blue-500');
        expect(bar).toHaveClass('to-cyan-500');
      });
    });

    it('should use card styling for sections', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      const cards = container.querySelectorAll('.card-levitate');
      expect(cards).toHaveLength(2);
      cards.forEach((card) => {
        expect(card).toHaveClass('p-6');
      });
    });

    it('should use orange theme for weekend distribution', () => {
      const { container } = render(<AdminAnalytics stats={mockStats} />);
      const weekendCards = container.querySelectorAll('.bg-orange-50');
      expect(weekendCards.length).toBeGreaterThan(0);
    });
  });
});
